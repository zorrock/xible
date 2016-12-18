module.exports = function(XIBLE) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let ansibleIn = NODE.addInput('ansible', {
			type: "ansible"
		});

		let hostIn = NODE.addInput('hostgroup', {
			type: "ansible.hostgroup"
		});

		let origPathIn = NODE.addInput('origin', {
			type: "string"
		});

		let destPathIn = NODE.addInput('destination', {
			type: "string"
		});

		let triggerOut = NODE.addOutput('done', {
			type: "trigger"
		});

		let failOut = NODE.addOutput('fail', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			if (!hostIn.isConnected() || !ansibleIn.isConnected()) {
				return;
			}

			Promise.all([ansibleIn.getValues(state), hostIn.getValues(state), origPathIn.getValues(state), destPathIn.getValues(state)])
				.then(([ansibles, hosts, origPaths, destPaths]) => {

					if (!origPaths.length) {
						origPaths = [NODE.data.origPath];
					}

					if (!destPaths.length) {
						destPaths = [NODE.data.destPath];
					}

					return Promise.all(ansibles.map((ansible) => {

						return Promise.all(hosts.map((host) => {

							return Promise.all(origPaths.map((origPath) => {

								return Promise.all(destPaths.map((destPath) => {

									let cmd = ansible.module('copy').hosts(host.groupName).args(`src=${NODE.data.origPath} dest=${NODE.data.destPath}`);

									cmd.on('stdout', (data) => {

										data = data.toString();
										if (!data) {
											return;
										}

										NODE.addStatus({
											message: data,
											timeout: 5000,
											color: data.indexOf('| success ') > -1 ? 'green' : null,
										});

									});

									return cmd.exec();

								}));

							}));

						}));

					}));

				}).then(() => {
					XIBLE.Node.triggerOutputs(triggerOut, state);
				}).catch((err) => {

					NODE.addStatus({
						message: err.toString(),
						timeout: 5000,
						color: 'red'
					});

					XIBLE.Node.triggerOutputs(failOut, state);

				});

		});

	}

	XIBLE.addNode('ansible.copy', {
		type: "action",
		level: 0,
		description: 'Copies a file on the local box to remote locations.'
	}, constr);

};
