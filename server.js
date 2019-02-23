const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt-nodejs');
const knex = require('knex');
const jwtmod = require('./modules/jwtmod');


// /*
//  ====================   JWT Signing =====================
// */
// const payload = {
//   data1: "Data 1",
//   data2: "Data 2",
//   data3: "Data 3",
//   data4: "Data 4",
// };
// const i  = 'Mysoft corp';   
// const s  = 'some@gmail.com';   
// const a  = 'http://mysoftcorp.in';
// const signOptions = {
//   issuer:  i,
//   subject:  s,
//   audience:  a,
// };
// const token = jwtmod.sign(payload, signOptions);
// console.log("Token :" + token);
// /*
// ====================   JWT Verify =====================
// */
// const verifyOptions = {
//   issuer:  i,
//   subject:  s,
//   audience:  a,
// };
// const legit = jwtmod.verify(token, verifyOptions);
// console.log("\nJWT verification result: " + JSON.stringify(legit));
// /*
// ====================   JWT End   =====================
// */

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'test',
    database : 'store-db'
  }
});

const app = express();

// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use('/static', express.static(__dirname + '/public'));

/*
(API endpoints)
/ --> GET = Server is working
/signin --> POST = success/fail
/register --> POST = user
/profile/:userId --> GET = user
/products --> GET = menu
(END)
*/

app.get('/', (req, res) => {
  res.send('Server is working');
});

app.post('/signin', (req, res) => {
  console.log('signin');
  const { email, password } = req.body;
  console.log(email, password);
  db.select('email', 'hash')
    .from('logins')
    .where('email', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', email)
          .then(users => {
            const payload = users[0];
            const i  = 'localhost';   
            const s  = payload.email;   
            const a  = 'http://localhost:3000';
            const signOptions = {
              issuer:  i,
              subject:  s,
              audience:  a,
            };
            const token = jwtmod.sign(payload, signOptions);
            const verifyOptions = {
              issuer:  i,
              subject:  s,
              audience:  a,
            };
            const legit = jwtmod.verify(token, verifyOptions);
            console.log("\nJWT verification result: " + JSON.stringify(legit));
            res.json({ token: token });
          })
          .catch(err => res.status(400).json('unable to get user'));
      } else {
        res.status(400).json('wrong credentials');
      }
    })
    .catch(err => res.status(400).json('wrong credentials'));
});

app.post('/register', (req, res) => {
  console.log('register');
  const { name, email, password } = req.body;
  console.log(name, email, password);
  const hash = bcrypt.hashSync(password);
  db.transaction(trx => {
    trx.insert({
      email: email,
      hash: hash
    })
    .into('logins')
    .returning('email')
    .then(loginEmails => {
      return trx('users')
        .returning('*')
        .insert({
          name: name,
          email: loginEmails[0],
          joined: new Date()
        })
        .then(users => {
          res.json(users[0]);
        });
    })
    .then(trx.commit)
    .catch(trx.rollback);
  })
  .catch(err => res.status(400).json('unable to register'));
});

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db
    .select('*')
    .from('users')
    .where({ id: id })
    .then(users => {
      if (users.length) {
        res.json(users[0]);
      } else {
        res.status(404).json('no such user');
      }
    })
    .catch(err => res.status(400).json('error getting a user'));
});

app.get('/products', (req, res) => {
  db
    .select('*')
    .from('products')
    .then(products => res.json(products))
    .catch(err => res.status(400).json('error getting a list of products'));
});

app.listen(3000, () => {
  console.log('Server is running on port 3000.');
});
