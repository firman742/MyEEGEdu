import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal, Link } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { takeUntil } from "rxjs/operators";
import { Subject, timer } from "rxjs";

import { channelNames } from "muse-js";
import { Bar } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch,
  fft,
  powerByBand
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";
import { bandLabels } from "../../utils/chartUtils";

export function getSettings() {
  return {
    cutOffLow: 5,
    cutOffHigh: 50,
    interval: 300,
    bins: 256,
    duration: 1024,
    srate: 256,
    name: 'Bands',
    secondsToSave: 10
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionBands) window.subscriptionBands.unsubscribe();

  window.pipeBands$ = null;
  window.multicastBands$ = null;
  window.subscriptionBands = null;

  // Build Pipe
  window.pipeBands$ = zipSamples(window.source.eegReadings$).pipe(
    bandpassFilter({
      cutoffFrequencies: [
        Settings.cutOffLow,
        Settings.cutOffHigh
      ],
      nbChannels: window.nchans
    }),
    epoch({
      duration: Settings.duration,
      interval: Settings.interval,
      samplingRate: Settings.srate
    }),
    fft({ bins: Settings.bins }),
    powerByBand(),
    catchError(err => {
      console.log(err);
    })
  );
  window.multicastBands$ = window.pipeBands$.pipe(
    multicast(() => new Subject())
  );
}

const dataCollection = []; // Array to collect all datasets (xValue, yValue)

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastBands$) {
    window.subscriptionBands = window.multicastBands$.subscribe(data => {
      setData(bandsData => {
        Object.values(bandsData).forEach((channel, index) => {
          channel.datasets[0].data = [
            data.delta[index],
            data.theta[index],
            data.alpha[index],
            data.beta[index],
            data.gamma[index]
          ];

          channel.xLabels = bandLabels;

          // Capture and store the incoming data
          const currentData = {
            xValue: bandLabels,
            yValue: [
              data.delta[index], // Assuming delta is your yValue for this example
              data.theta[index],
              data.alpha[index],
              data.beta[index],
              data.gamma[index]
            ],
          };

          // console.log(currentData);

          // Push currentData to the collection
          dataCollection.push(currentData);
        });

        return {
          ch0: bandsData.ch0,
          ch1: bandsData.ch1,
          ch2: bandsData.ch2,
          ch3: bandsData.ch3,
          ch4: bandsData.ch4
        };
      });
    });

    window.multicastBands$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function ResultClassificationData() {
  const classifiedData = getAverageByXValue(dataCollection);

  return calculateClassification(classifiedData);
}

// Function to get top 10 largest yValues
function getAverageByXValue(dataCollection) {
  const flatData = dataCollection.flatMap(item =>
    item.yValue.map((y, i) => ({ xValue: item.xValue[i], yValue: y }))
  );
  

  // Menggunakan reduce untuk mengelompokkan dan menghitung rata-rata
  const groupedData = flatData.reduce((acc, data) => {
    if (!acc[data.xValue]) {
      acc[data.xValue] = { total: 0, count: 0 };
    }
    acc[data.xValue].total += data.yValue;
    acc[data.xValue].count += 1;
    return acc;
  }, {});


  // Menghitung rata-rata untuk setiap xValue
  const averageDataArray = Object.entries(groupedData).map(([xValue, { total, count }]) => ({
    xValue,
    averageYValue: total / count
  }));

  console.log(averageDataArray);

  return averageDataArray;

}


// Function to determine classification state based on the most dominant frequencies
function calculateClassification(classifiedData) {
  // Pastikan ada cukup data
  if (classifiedData.length < 3) {
    return "Data tidak mencukupi untuk klasifikasi";
  }

  // Sort frequencies by yValue (highest first)
  const sortedFrequencies = classifiedData.sort((a, b) => b.averageYValue - a.averageYValue);

  // Ambil tiga frekuensi paling dominan
  const topThreeDominant = sortedFrequencies.slice(0, 3);

  // Destructure the top three dominant frequencies
  const [mostDominant, secondMostDominant, thirdMostDominant] = topThreeDominant;

  console.log([mostDominant, secondMostDominant, thirdMostDominant]);

  const isThetaDominant = [mostDominant.xValue, secondMostDominant.xValue].includes('Theta');
  const isAlphaDominant = [mostDominant.xValue, secondMostDominant.xValue].includes('Alpha');

  console.log([mostDominant, secondMostDominant, thirdMostDominant, isThetaDominant, isAlphaDominant, Math.min(mostDominant.averageYValue, secondMostDominant.averageYValue)]);

  // Classification logic
  if (isThetaDominant && isAlphaDominant) {
    // Jika Theta dan Alpha keduanya dominan
    if (thirdMostDominant.averageYValue < Math.min(mostDominant.averageYValue, secondMostDominant.averageYValue) &&
      thirdMostDominant.averageYValue > (0.5 * secondMostDominant.averageYValue)) {
      return "KESIAPAN SEDANG"; // Kesiapan belajar sedang
    }
    return "KESIAPAN TINGGI"; // Kesiapan belajar tinggi
  } else {
    // Jika tidak ada Tetha maupun Alpha yang dominan
    return "KESIAPAN RENDAH"; // Kesiapan belajar rendah
  }
}

export function renderModule(channels) {
  function renderCharts() {
    return Object.values(channels.data).map((channel, index) => {
      if (index === 0) {
        const options = {
          ...generalOptions,
          scales: {
            xAxes: [
              {
                scaleLabel: {
                  ...generalOptions.scales.xAxes[0].scaleLabel,
                  labelString: specificTranslations.xlabel
                }
              }
            ],
            yAxes: [
              {
                scaleLabel: {
                  ...generalOptions.scales.yAxes[0].scaleLabel,
                  labelString: specificTranslations.ylabel
                },
                ticks: {
                  min: 0,
                  max: 100
                }
              }
            ]
          },
          title: {
            ...generalOptions.title,
            text: 'Power by Frequency Band'
          }
        };

        if (channels.data.ch3.datasets[0].data) {
          const newData = {
            datasets: [{
              label: channelNames[0],
              backgroundColor: 'rgba(217,95,2)',
              data: channels.data.ch0.datasets[0].data,
              fill: false
            }, {
              label: channelNames[1],
              backgroundColor: 'rgba(27,158,119)',
              data: channels.data.ch1.datasets[0].data,
              fill: false
            }, {
              label: channelNames[2],
              backgroundColor: 'rgba(117,112,179)',
              data: channels.data.ch2.datasets[0].data,
              fill: false
            }, {
              label: channelNames[3],
              backgroundColor: 'rgba(231,41,138)',
              data: channels.data.ch3.datasets[0].data,
              fill: false
            }, {
              label: channelNames[4],
              backgroundColor: 'rgba(20,20,20)',
              data: channels.data.ch4.datasets[0].data,
              fill: false
            }],
            xLabels: channels.data.ch0.xLabels
          }

          return (
            <Card.Section key={"Card_" + 1}>
              <Bar key={"Line_" + 1} data={newData} options={options} />
            </Card.Section>
          );
        } else {
          return (
            <Card.Section>
              <TextContainer>
                <p> {[
                  "Hubungkan perangkat di atas untuk melihat grafiknya"
                ]}
                </p>
              </TextContainer>
            </Card.Section>
          )
        }
      } else {
        return null
      }
    });
  }

  return (
    <React.Fragment>
      <Card title={specificTranslations.title}>
        <Card.Section>
          <img
            src={require("./electrodediagram.png")}
            alt="Electrodes"
            width="20%"
            height="auto"
          ></img>
          <br></br>
          <img
            src={require("./electrode.png")}
            alt="Electrodes"
            width="30%"
            height="auto"
          ></img>
          <Stack>
            {/* <TextContainer>
              <p>{specificTranslations.description}</p>
            </TextContainer> */}
          </Stack>
        </Card.Section>
        <Card.Section>
          <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>

        </Card.Section>
      </Card>
      <Card title="Klasifikasi" sectioned>
        <TextContainer>
          <p>Berdasarkan Channel:</p>
          <ul>
            <li>Delta = 0 - 4 Hz (Tidur Nyenyak)</li>
            <li>Tetha = 4 - 8 Hz (Senang, Tidur ringan)</li>
            <li>Alpha = 8 - 12 Hz (Rileks, Mata Tertutup)</li>
            <li>Beta = 13 - 30 Hz (Sedang Berfikir)</li>
            <li>Gamma = 30 - 100 Hz (Berfikir sembari melakukan aktivitas lainnya)</li>
          </ul>
          <p>Sehingga dapat diambil kesimpulan dengan klasifikasi berikut:</p>
          <ul>
            <li>Tetha + Alpha Dominan = maka dalam keadaan siap belajar</li>
            <li>Tetha + Alpha Dominan, namun channel lain juga tinggi = maka dalam keadaan kesiapan belajar sedang</li>
            <li>Tetha + Alpha Tidak Dominan = maka dalam keadaan kesiapan belajar yang buruk</li>
          </ul>
        </TextContainer>
      </Card>
    </React.Fragment>
  );
}


// https://en.wikipedia.org/wiki/Neural_oscillation#/media/File:SimulationNeuralOscillations.png
// https://upload.wikimedia.org/wikipedia/commons/5/59/Analyse_spectrale_d%27un_EEG.jpg
//

export function renderSliders(setData, setSettings, status, Settings) {

  function resetPipeSetup(value) {
    buildPipe(Settings);
    setup(setData, Settings);
  }

  function handleIntervalRangeSliderChange(value) {
    setSettings(prevState => ({ ...prevState, interval: value }));
    resetPipeSetup();
  }

  function handleCutoffLowRangeSliderChange(value) {
    setSettings(prevState => ({ ...prevState, cutOffLow: value }));
    resetPipeSetup();
  }

  function handleCutoffHighRangeSliderChange(value) {
    setSettings(prevState => ({ ...prevState, cutOffHigh: value }));
    resetPipeSetup();
  }

  function handleDurationRangeSliderChange(value) {
    setSettings(prevState => ({ ...prevState, duration: value }));
    resetPipeSetup();
  }

  return (
    <Card></Card>
  )
}

export function renderRecord(recordPopChange, recordPop, status, Settings, setSettings) {

  function handleSecondsToSaveRangeSliderChange(value) {
    setSettings(prevState => ({ ...prevState, secondsToSave: value }));
  }

  return (
    <Card title={'Record Data'} sectioned>
    </Card>
  )
}
