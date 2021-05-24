'use strict';

const DummyBackend = config => {
	return {
		getState: () => Promise.resolve({
			latch: config.latch,
			door: config.door,
		}),
		lock: () => Promise.resolve({}),
		unlock: () => Promise.resolve({}),
	};
};

module.exports = DummyBackend;
