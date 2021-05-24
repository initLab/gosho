'use strict';

const request = require('superagent');

const NetcontrolBackend = config => {
	const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
	
	const makeRequest = url => request.get(url)
		.auth(config.username, config.password);
	
	const toggleState = newState => makeRequest(`${config.url}/iochange.cgi?ref=ioreg.js&${config.latchControlPin}=${newState ? '01' : '00'}`)
		.then(() => sleep(500));
	
	return {
		getState: () => {
			return request.get(`${config.url}/ioreg.js`)
				.auth(config.username, config.password)
				.then(res => res.body.toString())
				.then(data => {
					let ioString = data.match(/var\ IO\=\"([0-9A-Z,]+)\"/);
					let arr = ioString[1].split(',');
					console.log(arr);
					let sensors = {
						doorState: parseInt(arr[config.doorStatePin], 16) < 512,
						lockButton: parseInt(arr[config.lockButtonPin], 16) < 512,
						unlockButton: parseInt(arr[config.unlockButtonPin], 16) < 512,
						locked: parseInt(arr[config.lockedSensorPin], 16) < 512,
						unlocked: parseInt(arr[config.unlockedSensorPin], 16) < 512
					};
					console.log(sensors)
					let state = {
						latch: sensors.locked && !sensors.unlocked ? 'locked' : (
							!sensors.locked && sensors.unlocked ? 'unlocked' :
								'unknown' // failsafe
						),
						door: sensors.doorState ? 'closed' : 'open',
					}
					console.log(state);
					return state;
				});
		},
		lock: () => toggleState(true),
		unlock: () => toggleState(false),
	};
};

module.exports = NetcontrolBackend;
