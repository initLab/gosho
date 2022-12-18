'use strict';

// lib
const status = require('http-status');
const request = require('superagent');

// express dep
const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

// config
const config = require('./config.json');

// door backend module
const doorBackend = require(`./backends/${config.door.backend}`)(config.door.params);

// init app
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride());

const getState = (res, sendNotification) => {
	return doorBackend.getState()
		.then(state => {
			res.status(status.OK).json(state);
			if (sendNotification) {
				notify(state);
			}
		})
		.catch(err => {
			console.log(err);
			res.status(status.OK).json({latch: 'unknown', door: 'unknown'});
		});
};

const capitalize = str => str[0].toUpperCase() + str.slice(1);

const notify = state => request.post(config.notifier.url)
	.send({
		latch: capitalize(state.latch),
		door: capitalize(state.door),
		token: config.notifier.token
	})
	.then(res => console.log(res.body))
	.catch(err => console.log(err));

app.route('/status')
	.get((req, res) => getState(res, false));

app.route('/lock')
	.post((req, res) => doorBackend.lock()
		.then(getState(res, true)));

app.route('/unlock')
	.post((req, res) => doorBackend.unlock()
		.then(getState(res, true)));

const port = process.env.PORT || config.port || 3000;
const bindHost = process.env.BINDHOST || config.bindHost || '127.0.0.1';
app.listen(port, bindHost, () => console.log(`gosho listening on ${bindHost}:${port}`));
