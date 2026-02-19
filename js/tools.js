/**
 * EGEX Tools - Resource Calculator
 */

(function() {
	'use strict';

	// Calculate resource requirements based on user inputs
	function calculateResources() {
		const load = parseInt(document.getElementById('load').value) || 0;
		const cpu = parseInt(document.getElementById('cpu').value) || 1;
		const ram = parseInt(document.getElementById('ram').value) || 1;
		const estimated = (load / 100) * cpu * ram;
		document.getElementById('result').textContent = `Estimated resources: ${estimated.toFixed(2)} units`;
	}

	// Initialize when DOM is ready
	document.addEventListener('DOMContentLoaded', function() {
		const calculateBtn = document.getElementById('calculate-btn');
		if (calculateBtn) {
			calculateBtn.addEventListener('click', calculateResources);
		}
	});

})();
