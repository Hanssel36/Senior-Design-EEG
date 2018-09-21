/*
 * Numbers (adapted from https://github.com/Emotiv/cortex-example/tree/master/nodejs)
 * *******
 *
 * This example shows processing numerical data, such as band power readings,
 * performance metrics, and accelerometer/gyro data.
 *
 * You can control the amount of averaging by setting the avgWindow parameter.
 * 1 is the same as no averaging at all.
 *
 */

const fs = require('fs');
const Cortex = require("../lib/cortex");
const allBands = [
        'AF3/theta',
        'AF3/alpha',
        'AF3/betaL',
        'AF3/betaH',
        'AF3/gamma',
        'F7/theta',
        'F7/alpha',
        'F7/betaL',
        'F7/betaH',
        'F7/gamma',
        'F3/theta',
        'F3/alpha',
        'F3/betaL',
        'F3/betaH',
        'F3/gamma',
        'FC5/theta',
        'FC5/alpha',
        'FC5/betaL',
        'FC5/betaH',
        'FC5/gamma',
        'T7/theta',
        'T7/alpha',
        'T7/betaL',
        'T7/betaH',
        'T7/gamma',
        'P7/theta',
        'P7/alpha',
        'P7/betaL',
        'P7/betaH',
        'P7/gamma',
        'O1/theta',
        'O1/alpha',
        'O1/betaL',
        'O1/betaH',
        'O1/gamma',
        'O2/theta',
        'O2/alpha',
        'O2/betaL',
        'O2/betaH',
        'O2/gamma',
        'P8/theta',
        'P8/alpha',
        'P8/betaL',
        'P8/betaH',
        'P8/gamma',
        'T8/theta',
        'T8/alpha',
        'T8/betaL',
        'T8/betaH',
        'T8/gamma',
        'FC6/theta',
        'FC6/alpha',
        'FC6/betaL',
        'FC6/betaH',
        'FC6/gamma',
        'F4/theta',
        'F4/alpha',
        'F4/betaL',
        'F4/betaH',
        'F4/gamma',
        'F8/theta',
        'F8/alpha',
        'F8/betaL',
        'F8/betaH',
        'F8/gamma',
        'AF4/theta',
        'AF4/alpha',
        'AF4/betaL',
        'AF4/betaH',
        'AF4/gamma' ]

function rollingAverage(columns, windowSize) {
  let avgCount = 0;
  const averages = {};
  return row => {
    avgCount = Math.min(windowSize, avgCount + 1);

    columns.forEach((col, i) => {
      const oldAvg = averages[col] || 0;
      averages[col] = oldAvg + (row[i] - oldAvg) / avgCount;
    });

    return averages;
  };
}

function numbers(client, windowSize, onResult) {
  return client
    .createSession({ status: "open" })
    .then(() => client.subscribe({ streams: ["pow", "mot", "met"] }))
    // Subscribe to band power readings (pow), performance metrics (met), and accelerometer/gyro data (mot)
    .then(_subs => {
      const subs = Object.assign({}, ..._subs);
      if (!subs.pow || !subs.mot || !subs.met)
        throw new Error("failed to subscribe");

      // Print list of all subscribed streams
      console.log(subs)

      // Create a list of all the column indices relevant to each band
      // (there'll be one per sensor)
      const bands = {};
      allBands.forEach(band => bands[band] = [])

      for (let i = 0; i < subs.pow.cols.length; i++) {
        // pow columns look like: IED_AF3/alpha
        const bandName = subs.pow.cols[i];
        bands[bandName].push(i);
      }
      const bandNames = Object.keys(bands);

      // Motion data columns look like 'IMD_GYROX', this will make them look like 'gyroX'
      const makeFriendlyCol = col =>
        col.replace(
          /^IMD_(.*?)([XYZ]?)$/,
          (_, name, dim) => name.toLowerCase() + dim
        );

      const motCols = subs.mot.cols.map(makeFriendlyCol);

      // Set up our rolling average functions
      // met always gets a window size of 1 because at the basic subscription
      // level it's averaged over 10s anyway
      const averageMet = rollingAverage(subs.met.cols, 1);
      const averageMot = rollingAverage(motCols, windowSize);
      const averageBands = rollingAverage(bandNames, windowSize);

      const data = {};
      for (const col of [...motCols, ...subs.met.cols, ...bandNames]) {
        data[col] = 0;
      }

      const onMet = ev => maybeUpdate("met", averageMet(ev.met));
      client.on("met", onMet);

      const onMot = ev => maybeUpdate("mot", averageMot(ev.mot));
      client.on("mot", onMot);

      // This averages overall the sensors in the pow stream to give us our
      // "bands" stream
      const averageSensors = pow =>
        bandNames.map(bandName => {
          const sum = bands[bandName]
            .map(i => pow[i])
            .reduce((total, row) => total + row, 0);
          return sum / bands[bandName].length;
        });

      const onPow = ev =>
        maybeUpdate("bands", averageBands(averageSensors(ev.pow)));
      client.on("pow", onPow);

      // Choosing whether to update here is a bit tricky - we want to update
      // at the rate of the fastest stream, but we don't know which one that
      // will be. So we just wait until we get a second update for the same
      // stream to send everything - that stream must be the fastest.
      let hasUpdate = {};
      const maybeUpdate = (key, newdata) => {
        if (hasUpdate[key]) {
          onResult(data);
          hasUpdate = {};
        }
        hasUpdate[key] = true;
        Object.assign(data, newdata);
      };

      return () =>
        client
          .unsubscribe({ streams: ["pow", "mot", "met"] })
          .then(() => client.updateSession({ status: "close" }))
          .then(() => {
            client.removeListener("mot", onMot);
            client.removeListener("pow", onPow);
          });
    });
}

if (require.main === module) {
  process.on("unhandledRejection", err => {
    throw err;
  });

  // We can set LOG_LEVEL=2 or 3 for more detailed errors
  const verbose = process.env.LOG_LEVEL || 1;
  const options = { verbose };
  const avgWindow = 10;

  const client = new Cortex(options);

  var input_num = 0;
  const outfile = "/tmp/eeg_output.csv"

  client.ready.then(() => client.init()).then(() =>
    numbers(client, avgWindow, averages => {

      const keys = Object.keys(averages)
        .join(",");
      const output = Object.keys(averages)
        .map(k => `${averages[k].toFixed(2)}`)
        .join(",");

      if (input_num === 0){
        fs.writeFile(outfile, keys+"\n", function(err) {
          if(err) {
              return console.log(err);
          }
        });
      }

      console.log(input_num++);
      console.log(keys);
      console.log(output);

      fs.appendFile(outfile, output+"\n", function(err) {
        if(err) {
            return console.log(err);
        }
      });

    })
  );

  // We could use the value returned by numbers) here, but when we ctrl+c it
  // will clean up the connection anyway


}

module.exports = numbers;
