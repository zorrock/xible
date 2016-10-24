module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let msecIn = NODE.addInput('msecs', {
			type: "math.number"
		});

		let triggerOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			let delayFunction = (statusId) => {

				NODE.removeProgressBarById(statusId, 700);
				FLUX.Node.triggerOutputs(triggerOut, state);

			};

			FLUX.Node.getValuesFromInput(msecIn, state).then(delays => {

				let fromData = false;
				if (!delays.length) {

					fromData = true;
					delays.push(NODE.data.delay || 0);

				}

				delays.forEach((delay) => {

					delay = Math.round(delay);

					let statusId = NODE.addProgressBar({
						message: (fromData ? null : `waiting for ${delay} msec`),
						percentage: 0,
						updateOverTime: delay
					});

					setTimeout(() => delayFunction(statusId), delay);

				});

			});

		});

	}

	FLUX.addNode('timing.delay', {
		type: "action",
		level: 0,
		groups: ["timing"]
	}, constr);

};
