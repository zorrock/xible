const sentiment = require('sentiment');

module.exports = function(XIBLE) {

	function constr(NODE) {

		let stringIn = NODE.addInput('string', {
			type: "string"
		});

		let scoreOut = NODE.addOutput('score', {
			type: "math.number"
		});

		scoreOut.on('trigger', (conn, state, callback) => {

			stringIn.getValues(state).then((strs) => {

				let results;

				if (strs.length) {
					results = strs.map((str) => sentiment(str).score);
				} else {
					results = [];
				}

				callback(results);

			});

		});

	}

	XIBLE.addNode('sentiment', {
		type: "object",
		level: 0,
		description: `Performs sentiment analysis on the input string(s) and returns the corresponding sentiment number. Uses the AFINN-165 wordlist to do so.`
	}, constr);

};
