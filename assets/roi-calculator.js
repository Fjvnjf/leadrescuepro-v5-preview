(() => {
  const inputs = Object.fromEntries([...document.querySelectorAll('[data-roi-input]')].map((el) => [el.dataset.roiInput, el]));
  const outputs = Object.fromEntries([...document.querySelectorAll('[data-roi-output]')].map((el) => [el.dataset.roiOutput, el]));
  if (!outputs.revenueRisk || !outputs.grossProfitRisk || !outputs.missedSummary || !outputs.firstMonth || !outputs.ongoing || !outputs.context || !Object.keys(inputs).length) return;

  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.max(0, value));
  const plural = (count, singular, multiple = `${singular}s`) => `${count} ${count === 1 ? singular : multiple}`;
  const update = () => {
    const jobValue = Math.max(0, Number(inputs.jobValue?.value) || 0);
    const grossProfit = Math.max(0, Number(inputs.grossProfit?.value) || 0);
    const callVolume = Math.max(0, Number(inputs.callVolume?.value) || 0);
    const rawMissedCalls = Math.max(0, Number(inputs.missedCalls?.value) || 0);
    const missedCalls = callVolume ? Math.min(callVolume, rawMissedCalls) : rawMissedCalls;
    const revenueRisk = missedCalls * jobValue;
    const grossProfitRisk = missedCalls * grossProfit;
    const firstMonthJobs = grossProfit ? Math.ceil((997 + 499) / grossProfit) : 0;
    const ongoingJobs = grossProfit ? Math.ceil(499 / grossProfit) : 0;

    outputs.revenueRisk.textContent = money(revenueRisk);
    outputs.grossProfitRisk.textContent = money(grossProfitRisk);
    outputs.missedSummary.textContent = plural(missedCalls, 'call');
    outputs.firstMonth.textContent = firstMonthJobs ? `${plural(firstMonthJobs, 'job')} in month one` : 'Add gross profit per job';
    outputs.ongoing.textContent = ongoingJobs ? `${plural(ongoingJobs, 'job')}/month after that` : 'to see break-even';
    const missedRate = callVolume ? Math.min(100, (missedCalls / callVolume) * 100) : 0;
    outputs.context.textContent = callVolume
      ? `${missedCalls} of ${callVolume} calls estimated missed (${missedRate.toFixed(0)}%). At ${money(grossProfit)} gross profit per job. Estimate only.`
      : 'Add monthly call volume to see your missed-call rate. Estimate only.';
  };
  Object.values(inputs).forEach((input) => input.addEventListener('input', update));
  update();
})();
