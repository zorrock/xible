module.exports = function(XIBLE) {

	function constr(NODE) {

		let used = false;
		let refreshing = false;
		let variable;

		let refreshIn = NODE.addInput('refresh', {
			type: "trigger"
		});

		let valueIn = NODE.addInput('value');

		let refreshOut = NODE.addOutput('refreshed', {
			type: "trigger"
		});

		let variableOut = NODE.addOutput('variable', {
			type: "variable"
		});

		refreshIn.on('trigger', (conn, state) => {

			//get the input values
			refreshing = true;
			valueIn.getValues(state).then(vals => {

				//
				used = true;
				refreshing = false;
				variable = {
					name: NODE.data.name,
					values: vals
				};

				//save the state
				state.set(this, variable);

				XIBLE.Node.triggerOutputs(refreshOut, state);

			});

		});

		variableOut.on('trigger', (conn, state, callback) => {

			//state handling (if refresh complete was used)
			let thisState = state.get(this);
			if (thisState) {

				callback(thisState);
				return;

			}

			//callback immeditialy if we already have this value(s) in store
			if (used) {

				callback(variable);
				return;

			}

			//wait to callback when we're currently refreshing the value(s)
			if (refreshing) {

				variableOut.once('triggerdone', () => {
					callback(variable);
				});

				return;

			}

			//perform a refresh of all inputs and return those values
			refreshing = true;
			valueIn.getValues(state).then((vals) => {

				variable = {
					name: NODE.data.name,
					values: vals
				};

				used = true;
				refreshing = false;

				callback(variable);

			});

		});

	}

	XIBLE.addNode('variable', {
		type: "object",
		level: 0,
		description: `Represents a named variable.`
	}, constr);

};
