var express = require('express');
var session = require('express-session');

var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');


var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'anything',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

//////////////
//Middleware//
//////////////

function loggedIn(req, res, next) {
  console.log(req.session.user)
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

///////////
//APP.GET//
///////////

// app.use(cookieParser());

// REDIRECT to '/login'  if User is not LOGGED IN //
app.get('/login', //make new client side for login (view, model)
function(req, res) {
  res.render('login'); 
});
// 

//potentially change this to /login
app.get('/', loggedIn,
  function (req, res) {
    res.render('index');
  });

//originally create
app.get('/create', loggedIn,
  function (req, res) {
    res.render('index');
  });

//originally links // Implement login redirect here
app.get('/links',
  function (req, res) {
    Links.reset().fetch().then(function (links) {
      res.status(200).send(links.models);
    });
  });

//implement signup password here and use bcrypt
// app.get('/signup',
//   function (req, res) {
//     res.render('signup');
//   })

////////////
//APP.POST//
////////////

// app.post('/signup',
// function(req, res){
//req.body.username push into table schema
//req.body.password push into schema
// })

app.post('/links',
  function (req, res) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.sendStatus(404);
    }

    new Link({ url: uri }).fetch().then(function (found) {
      if (found) {
        res.status(200).send(found.attributes);
      } else {
        util.getUrlTitle(uri, function (err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.sendStatus(404);
          }

          Links.create({
            url: uri, //might change this to url(req.body.url)
            title: title,
            baseUrl: req.headers.origin
          })
            .then(function (newLink) {
              res.status(200).send(newLink);
            });
        });
      }
    });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

// app.post('/login', 
//   function (req, res) {
//     var username = req.body.username;
//     var password = req.body.password;
//     app.db.get("SELECT username FROM users", function(err, row){
//       console.log('row', row)
//       //res.json({ "count" : row.value });
//   });
//     // if(username === ){

//     // }
//   //console.log('req.body', req.body, 'db', db.body)
// });


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function (req, res) {
  new Link({ code: req.params[0] }).fetch().then(function (link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function () {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function () {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
