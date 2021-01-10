'use strict';

const status = require('http-status');

// lib
const path = require('path');

// express dep
const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
// const cors = require('cors');
// const morgan = require('morgan');
const request = require('superagent')
const config = require('./config.json');

// init app
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride());

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const capitalize = str => str[0].toUpperCase() + str.slice(1);

const processState = (data) => {
  let ioString = data.match(/var\ IO\=\"([0-9A-Z,]+)\"/);
  let arr = ioString[1].split(',');
  console.log(arr);
  let sensors = {
    doorState: parseInt(arr[24], 16) < 512,
    lockButton: parseInt(arr[25], 16) < 512,
    unlockButton: parseInt(arr[26], 16) < 512,
    locked: parseInt(arr[27], 16) < 512,
    unlocked: parseInt(arr[28], 16) < 512
  };
  console.log(sensors)
  let state = {
    latch: sensors.locked && !sensors.unlocked
      ? 'locked'
      : !sensors.locked && sensors.unlocked
        ? 'unlocked'
        : 'unknown',
    door: sensors.doorState ? 'closed' : 'open'
  }
  console.log(state);
  return state;
}

const getState = () => request.get(`${config.door.url}/ioreg.js`)
  .auth(config.door.username, config.door.password)
  .then(res => res.body.toString())
  .then(processState)

const notify = state => request.post(config.notifier.url)
   .send({
     latch: capitalize(state.latch),
     door: capitalize(state.door),
     token: config.notifier.token
   })
   .then(res => console.log(res.body))
   .catch(err => console.log(err));

app.route('/status')
  .get((req, res) =>
    getState()
      .then(state => res.status(status.OK).json(state))
      .catch(err => {
        console.log(err);
        res.status(status.OK).json({latch: 'unknown', door: 'unknown'});
      }))

app.route('/lock')
  .post((req, res) =>
    request.get(`${config.door.url}/iochange.cgi?ref=ioreg.js&09=01`)
      .auth(config.door.username, config.door.password)
      .then(() => sleep(500))
      .then(getState)
      .then(state => {
        res.status(status.OK).json(state);
        notify(state);
      })
      .catch(err => {
        console.log(err);
        res.status(status.OK).json({latch: 'unknown', door: 'unknown'});
      }))

app.route('/unlock')
  .post((req, res) =>
    request.get(`${config.door.url}/iochange.cgi?ref=ioreg.js&09=00`)
      .auth(config.door.username, config.door.password)
      .then(() => sleep(500))
      .then(getState)
      .then(state => {
        res.status(status.OK).json(state);
        notify(state);
      })
      .catch(err => {
        console.log(err);
        res.status(status.OK).json({latch: 'unknown', door: 'unknown'});
      }))


const port = process.env.PORT || config.port || 3000;
app.listen(port, () => console.log(`gosho listening to port ${port}`));
