'use strict';

const request = require('superagent');

const NetcontrolBackend = config => {
	const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

	const makeRequest = url => request.get(url)
		.auth(config.username, config.password);

	const toggleState = newState => makeRequest(`${config.url}/params.cgi?ref=re-io&0A=${newState ?
		config.lockMacroNumber : config.unlockMacroNumber}`)
		.then(() => sleep(config.operationTimeMs));

	return {
		getState: () => {
			return request.get(`${config.url}/ioreg.js`)
				.auth(config.username, config.password)
				.then(res => res.body.toString())
				.then(data => {
					let ioString = data.match(/var IO="([0-9A-Z,]+)"/);
					let arr = ioString[1].split(',');
					console.log(arr);
					let sensors = {
						doorLocked: parseInt(arr[config.doorLockedPin], 16) >= 512,
						doorUnlocked: parseInt(arr[config.doorUnlockedPin], 16) >= 512,
						doorClosed: parseInt(arr[config.doorClosedPin], 16) >= 512,
					};
					console.log(sensors)
					let state = {
						latch: sensors.doorLocked && !sensors.doorUnlocked ? 'locked' : (
							!sensors.doorLocked && sensors.doorUnlocked ? 'unlocked' :
								'unknown' // failsafe
						),
						door: sensors.doorClosed ? 'closed' : 'open',
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
