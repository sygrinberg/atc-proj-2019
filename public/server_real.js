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

var templates = {
  blockchain: `Hi, how are you? I got your details from the Blockchain Summit event, and I would like to connect you with a startup company that its platform is based in Blockchain.
                The company is on a rise right now, and recently finished a very successful funding round, and they looking for expand, and we need a talented developers who are experts in Blockchain.
              They are offering amazing benefits (including Bitcoin) and great salaries too!
              For more details about this position, please check the following link:
              https://bit.ly/2XdhZpG
              Waiting for update,
              Sharon.</div>`,
  ui: `<div>Hello, how are you?
        My name is Sharon and I am a sourcing specialist who working with the lead Tech companies today.
        I got your details from the Angular meetup you recently attended, and I would like to offer you in a position that might be perfect for you!
        The company using the latest technologiea (you can find more find details here: https://bit.ly/2XdhZpG).
        
        Waiting to hear from you,
        Sharon.</div>
        `
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


app.post('/process', function(req, res, next) {
  pastEvents = {};
  topic =  req.body.topic;
  if (!topic) res.send({});
  meetup.getOpenEvents({
    lat: '32.06864929199219',
    lon: '34.793453216552734',
    topic: topicsMap[topic],
    time: '-6m,1m',
    status: 'past',
    category: '34',
    radius: 50
  }, function(eventsErr, eventsResponse) {
    if (eventsErr) {
      // Handle later
    }
    var date = new Date();
    eventsResponse.results.forEach(function(event) {
      if (event.time < date.getTime()) {
        pastEvents[event.id] = event;
      }
    });

    next();
  });
}, function(req, res, next) {
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

          return `
            meetup topics: ${topicsMap[topic]}
            meetup name: ${event.name}
            meetup host/group name: ${event.group.name}
            meetup location name: ${(event.venue || {}).address_2 || ''}
            meetup date: ${new Date(event.time)}
          `;
        });
        res.send(strings);
      
        emails.forEach(function(email) {
          var bodyFormData = new FormData();
          bodyFormData.append('from', 'testemail@address.com');
          bodyFormData.append('message', templates[topic]);
          bodyFormData.append('message', 'test content');
          bodyFormData.append('to', email);

          axios.post('https://bezeq.000webhostapp.com/emailsenderphp.php', bodyFormData, {
            headers: bodyFormData.getHeaders(),
          }).then(result => {
            // Handle result…
            console.log(result.data);
          });  
        });
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