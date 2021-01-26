const path = require('path');
const fs = require('fs');
const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = 
`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.sg4w7.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?authSource=admin&replicaSet=atlas-praijc-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`;

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    console.log('Ejecuto Accept');
    cb(null, true);
  } else {
    console.log('Ejecuto Decline');
    cb(null, false);
  }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const { Stream } = require('stream');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'), 
  {flags: 'a'}
  );

app.use(helmet({contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: storage, fileFilter: fileFilter }).single('image')
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: 'mi secreto', 
    resave: false, 
    saveUninitialized: false, 
    store: store
  })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
})

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((err, req, res, next) => {
  res.redirect('/500');
});

mongoose
  .connect(
    MONGODB_URI
  )
  .then(result => {
    // https
    // .createServer({key: privateKey, cert: certificate}, app)
    //.listen(process.env.PORT || 3000);
    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });
