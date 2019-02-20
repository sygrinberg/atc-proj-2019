var express = require('express');
var bodyParser = require("body-parser");
var axios = require('axios');
var FormData = require('form-data');
var meetup = require('meetup-api')({
	key: '3e565b1e1e4d466c5714f69145a264b'
});
var app = new express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
var path = require("path");

var date = new Date();

var topicsMap = {
  ui: 'javascript,redux,react,angularjs,angular2,angular-2,angular-3,angular-4,angular-5,angular-6,angular-7,vue',
  blockchain: 'blockchain',
};

var fillTemplate = function(templateString, templateVars){
  return new Function("return `"+templateString +"`;").call(templateVars);
}

var messageTemplates = {
  blockchain: ["Hi, ${this.personName} how are you?",
                "It was great to see you at the ${this.meetupName} meetup at ${this.meetupLocationName} on ${this.meetupDate}   and I would like to connect you with a startup company that its platform is based in Blockchain. The company is on a rise right now, and recently finished a very successful funding round, and they looking for expand, and we need a talented developers who are experts in Blockchain. They are offering amazing benefits (including Bitcoin) and great salaries too! For more details about this position, please check the following link: https://bit.ly/2XdhZpG",
                "Waiting for update, ",
                "${this.meetupHostName}",
                "${this.meetupGroupName}.",
              ].join('\n'),
  ui: ["Hello ${this.personName}! How are you? My name is Sharon and I am a sourcing specialist who working with the lead Tech companies today. I got your detailed from ${this.meetupHostName}, who was really impressed from your knowledge at the ${this.meetupName} meetup in ${this.meetupLocationName} you attended on ${this.meetupHostName}, and I would like to offer you in a position that might be perfect for you! The company using the latest technologies (you can find more find details here: https://bit.ly/2XdhZpG). ",
        "Waiting to hear from you, Sharon."
            ].join('\n')
};

var fromTemplates = {
  blockchain: "${this.meetupHostEmailName}@meetup.com",
  ui: "sharon@meetup-recruit.com"
};

fromNameTemplates = {
  blockchain: "${this.meetupHostName}",
  ui: "Sharon"
};

var subjectTemplates = {
  blockchain: "Blockcahin meetup - ${this.meetupDate}  – Opportunities suggestions",
  ui: "${this.meetupName} -${this.meetupDate}  – job opportunity"
};

function getEmails(fullName) {
  var names = fullName.split(' ');
  if (names.length < 2) return [];
  return [
    `${names[0].charAt(0)}${names[1]}@gmail.com`,
    `${names[1].charAt(0)}${names[0]}@gmail.com`,
    `${names[0]}${names[1]}@gmail.com`,
    `${names[1]}${names[0]}@gmail.com`,
    `${names[0]}.${names[1]}@gmail.com`,
    `${names[1]}.${names[0]}@gmail.com`,
  ];
}

var pastEvents = {};
var topic =  '';
var emailDestination = '';

function sendEmail(event, rsvp) {
  var templateStrings = {
    meetupHostName: event.event_hosts[0].member_name,
    meetupHostEmailName: event.event_hosts[0].member_name.replace(/\s/, '').toLowerCase(),
    meetupGroupName: event.group.name,
    meetupDate: new Date(event.time).toDateString(),
    personName: rsvp.member.name,
    meetupName: event.name,
    meetupLocationName: event.venue.name,
  };

  var emailStrings = {
    from: fillTemplate(fromTemplates[topic], templateStrings),
    fromName: fillTemplate(fromNameTemplates[topic], templateStrings),
    subject: fillTemplate(subjectTemplates[topic], templateStrings),
    message: fillTemplate(messageTemplates[topic], templateStrings)
  };
  
  
  
  var bodyFormData = new FormData();
  bodyFormData.append('from', emailStrings.from);
  bodyFormData.append('from_name', emailStrings.fromName);
  bodyFormData.append('subject', emailStrings.subject);
  bodyFormData.append('message', emailStrings.message);
  bodyFormData.append('to', emailDestination);
  axios.post('https://bezeq.000webhostapp.com/emailsendproj.php', bodyFormData, {
    headers: bodyFormData.getHeaders(),
  }).then(result => {
    // Handle result…
    console.log(result.data);
  }).catch(function(err) {
    console.log(err);
  });
  return emailStrings;
}

function getRsvps(params) {
  meetup.getRSVPs(params, function(rvspErr, rvspResponse) {
    if (rvspErr) {
      // Handle later
    }
    rsvps = [...rsvps, ...rvspResponse.results];
    if (rvspResponse.meta.next) {
      console.log(rvspResponse.meta.next);
      var newParams = {};
      rvspResponse.meta.next.replace(/\%2C/g, ',').split('?')[1]
          .split('&')
          .forEach(function(param) {
            var splitParam = param.split('=');
            newParams[splitParam[0]] = splitParam[1];
          });
      getRsvps(newParams);
    } else {
      res.send(rsvps);
    }
  });
}

function getOpenEvents(req, res, next) {
  pastEvents = {};
  topic =  req.body.topic;
  emailDestination = req.body.email || 'ckgmygtestproj@mailinator.com';
  if (!topic) res.send({});
  // Getting the open events from the selected topic
  meetup.getOpenEvents({
    // The topic selected from the user
    // The rest of the params specifying the Tel Aviv location and time
    lat: '32.06864929199219',
    lon: '34.793453216552734',
    fields: 'event_hosts',
    topic: topicsMap[topic],
    time: '-6m,1m',
    status: 'past',
    category: '34',
    radius: 50
  }, function(eventsErr, eventsResponse) {
    if (eventsErr) {
      res.write({});
    }
    var date = new Date();
    eventsResponse.results.forEach(function(event) {
      if (event.time < date.getTime()) {
        pastEvents[event.id] = event;
      }
    });

    next();
  });
}


app.post('/process', getOpenEvents, function(req, res, next) {
  var guestMap = {};
  var pastEventsKeys = Object.keys(pastEvents); 
  var eventsStrings = pastEventsKeys.reduce(function(str, cur, index) {
    return str + pastEvents[cur].id + (index !== (pastEventsKeys.length - 1) ? ',' : '');
  }, '');

  var rsvps = [];
  function getRsvps(params) {
    meetup.getRSVPs(params, function(rvspErr, rvspResponse) {
      if (rvspErr) {
        console.log(rvspErr);
      }
      rsvps = [...rsvps, ...rvspResponse.results];
      if (rvspResponse.meta.next) {
        var newParams = {};
        rvspResponse.meta.next.replace(/\%2C/g, ',').split('?')[1]
            .split('&')
            .forEach(function(param) {
              var splitParam = param.split('=');
              newParams[splitParam[0]] = splitParam[1];
            });
        getRsvps(newParams);
      } else {
        var strings = rsvps.map(function(rsvp) {
          var member = rsvp.member;
          var event = pastEvents[rsvp.event.id];
          if (guestMap[member.name]) return;
          guestMap[member.name] = true;
        
          var emails = getEmails(member.name);
          if (!emails.length) return;

          var templateStrings = {
            meetupHostName: event.event_hosts[0].member_name,
            meetupHostEmailName: event.event_hosts[0].member_name.replace(/\s/, '').toLowerCase(),
            meetupGroupName: event.group.name,
            meetupDate: new Date(event.time).toDateString(),
            personName: member.name,
            meetupName: event.name,
            meetupLocationName: (event.venue || {}).name || '',
          };

          return {
            from: fillTemplate(fromTemplates[topic], templateStrings),
            fromName: fillTemplate(fromNameTemplates[topic], templateStrings),
            subject: fillTemplate(subjectTemplates[topic], templateStrings),
            message: fillTemplate(messageTemplates[topic], templateStrings)
          };
          // On this stage I suppose to send email to that RSVP
          // Due to the regulatory constraints I need to stop here
        });
        
        var rsvp = rsvps[0];
        var event = pastEvents[rsvp.event.id];
        emailStrings = sendEmail(event, rsvp);

        res.send([`${emailStrings.from}\n${emailStrings.subject}\n${emailStrings.message}`]);
      }
    });
  }

  getRsvps({
    event_id: eventsStrings,
  });
});
app.use("*", function(req, res) {
  res.sendFile("/public/index.html");
});

app.listen(3000);