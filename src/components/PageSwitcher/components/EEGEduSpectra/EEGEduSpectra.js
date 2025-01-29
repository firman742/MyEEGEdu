import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack } from "@shopify/polaris";
import { Subject } from "rxjs";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch,
  fft,
  sliceFFT
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as specificTranslations from "./translations/en";

export function getSettings() {
  return {
    cutOffLow: 1,
    cutOffHigh: 100,
    interval: 100,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 100,
    duration: 1024,
    srate: 256,
    name: 'Spectra',
    secondsToSave: 10

  }
};


export function buildPipe(Settings) {
  if (window.subscriptionSpectra) window.subscriptionSpectra.unsubscribe();

  window.pipeSpectra$ = null;
  window.multicastSpectra$ = null;
  window.subscriptionSpectra = null;

  // Build Pipe 
  window.pipeSpectra$ = zipSamples(window.source.eegReadings$).pipe(
    bandpassFilter({
      cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh],
      nbChannels: window.nchans
    }),
    epoch({
      duration: Settings.duration,
      interval: Settings.interval,
      samplingRate: Settings.srate
    }),
    fft({ bins: Settings.bins }),
    sliceFFT([Settings.sliceFFTLow, Settings.sliceFFTHigh]),
    catchError(err => {
      console.log(err);
    })
  );

  window.multicastSpectra$ = window.pipeSpectra$.pipe(
    multicast(() => new Subject())
  );
}
const dataCollection = []; // Array to collect all datasets (xValue, yValue)

export function setup(setData, Settings) {

  if (window.multicastSpectra$) {
    window.subscriptionSpectra = window.multicastSpectra$.subscribe(data => {
      // Collect all datasets
      setData(spectraData => {
        Object.values(spectraData).forEach((channel, index) => {
          channel.datasets[0].data = data.psd[index];
          channel.xLabels = data.freqs;
          // console.log(channel);

          const currentData = {
            yValue: data.psd[index], // amplitude
            xValue: data.freqs, // frequency
          };

          // console.log(currentData);
          // Store yValue (data.psd) and xValue (data.freqs) for each channel
          dataCollection.push(currentData);


        });

        return {
          // ch0: spectraData.ch0,
          ch1: spectraData.ch1,
          ch2: spectraData.ch2,
          ch3: spectraData.ch3,
          ch4: spectraData.ch4
        };
      });
    });

    window.multicastSpectra$.connect();
  }

}

export function ResultTop10Data() {
  return getTop10LargestData(dataCollection);
}
export function ResultClassification() {
  const topData = ResultTop10Data();
  return classifyData(topData);
}
export function ResultClassificationData() {
  const classifiedData = ResultClassification();
  return calculateClassification(classifiedData);
}

// Function to get top 10 largest yValues
function getTop10LargestData(dataCollection) {
  const flatData = dataCollection.flatMap(item =>
    item.yValue.map((y, i) => ({ xValue: item.xValue[i], yValue: y }))
  );

  // Menggunakan Map untuk menyimpan xValue unik dengan yValue tertinggi
  const uniqueDataMap = new Map();

  flatData.forEach(data => {
    if (!uniqueDataMap.has(data.xValue) || uniqueDataMap.get(data.xValue) < data.yValue) {
      uniqueDataMap.set(data.xValue, data.yValue);
    }
  });
  console.log(flatData);


  // Konversi hasil ke array dan urutkan berdasarkan yValue
  const uniqueDataArray = Array.from(uniqueDataMap, ([xValue, yValue]) => ({ xValue, yValue }));
  console.log(uniqueDataArray);

  // Ambil 10 nilai terbesar berdasarkan yValue
  return uniqueDataArray.sort((a, b) => b.yValue - a.yValue).slice(0, 10);
}

// Function to classify data based on frequency range
function classifyData(topData) {
  return topData.map(data => {
    let name = "";
    if (data.xValue >= 0 && data.xValue <= 4) {
      name = "Delta";
    } else if (data.xValue > 4 && data.xValue <= 8) {
      name = "Tetha";
    } else if (data.xValue > 8 && data.xValue <= 12) {
      name = "Alpha";
    } else if (data.xValue > 12 && data.xValue <= 30) {
      name = "Beta";
    } else if (data.xValue >= 30) {
      name = "Gamma";
    }
    return { ...data, name };
  });
}

// Function to determine classification state based on the most dominant frequencies
function calculateClassification(classifiedData) {
  // Count frequency occurrence
  const frequencyCount = classifiedData.reduce((acc, data) => {
    acc[data.name] = (acc[data.name] || 0) + 1;
    return acc;
  }, {});


  // Sort frequencies by dominance (highest count first)
  const sortedFrequencies = Object.entries(frequencyCount).sort((a, b) => b[1] - a[1]);
  const [mostDominant, secondMostDominant, thirdMostDominant] = sortedFrequencies;

  const isTethaDominant = [mostDominant[0], secondMostDominant[0]].includes('Tetha'); // yang jadi pertanyaan selanjutnya apakah perlu mengecek kedominanan tetha maupun alpha dari thirdMostDominan
  const isAlphaDominant = [mostDominant[0], secondMostDominant[0]].includes('Alpha');
  
  console.log([mostDominant, secondMostDominant, thirdMostDominant, isTethaDominant, isAlphaDominant]);
  // Ensure at least two dominant frequencies are available
  if (!mostDominant || !secondMostDominant) {
    return "Data tidak mencukupi untuk klasifikasi";
  }
  // Classification logic
  // Yang dimaksud dominan Tetha dan alpha = Jika Tetha Dan Alpha Sama2 berada di antara 3 dominan ini maka kesiapan tinggi
  // namun jika ada frequensi lain yang lebih dominan selain Tetha dan Alpha maka Kesiapan sedang
  // jika tetha dan alpha tidak dominan maka kesiapan rendah

  // Jika Tetha dan Alpha keduanya berada di antara tiga frekuensi dominan
  if (isTethaDominant && isAlphaDominant) {
     // Jika Tetha dan Alpha keduanya berada di antara dua frekuensi dominan
     if (thirdMostDominant && !['Tetha', 'Alpha'].includes(thirdMostDominant[0])) {
      return "KESIAPAN SEDANG"; // Jika thirdMostDominant bukan Tetha atau Alpha
    }
    return "KESIAPAN TINGGI";
  } else {
    // Jika tidak ada Tetha maupun Alpha yang dominan
    return "KESIAPAN RENDAH";
  }
  // Default fallback
  return "Klasifikasi Tidak Diketahui";
}

export function renderModule(channels) {
  function renderCharts() {
    let vertLim = Math.floor(Math.max(...[].concat.apply([], [
      // channels.data.ch0.datasets[0].data,
      channels.data.ch1.datasets[0].data,
      channels.data.ch2.datasets[0].data,
      channels.data.ch3.datasets[0].data,
      channels.data.ch4.datasets[0].data
    ])
    ));
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
              max: vertLim,
              min: vertLim * -1
            }
          }
        ]
      },
      elements: {
        point: {
          radius: 3
        }
      },
      title: {
        ...generalOptions.title,
        text: 'Spectra data from each electrode'
      },
      legend: {
        display: true
      }
    };

    if (channels.data.ch3.datasets[0].data) {
      const newData = {
        datasets: [
        //   {
        //   label: channelNames[0],
        //   borderColor: 'rgba(217,95,2)',
        //   data: channels.data.ch0.datasets[0].data,
        //   fill: false
        // }, 
        {
          label: channelNames[1],
          borderColor: 'rgba(27,158,119)',
          data: channels.data.ch1.datasets[0].data,
          fill: false
        }, {
          label: channelNames[2],
          borderColor: 'rgba(117,112,179)',
          data: channels.data.ch2.datasets[0].data,
          fill: false
        }, {
          label: channelNames[3],
          borderColor: 'rgba(231,41,138)',
          data: channels.data.ch3.datasets[0].data,
          fill: false
        }, {
          label: channelNames[4],
          borderColor: 'rgba(20,20,20)',
          data: channels.data.ch4.datasets[0].data,
          fill: false
        }],
        xLabels: channels.data.ch1.xLabels
      }

      return (
        <Card.Section key={"Card_" + 1}>
          <Line key={"Line_" + 1} data={newData} options={options} />
        </Card.Section>
      );
    } else {
      return (
        <Card.Section>
          <Stack>
            <TextContainer>
              <p>{'Hubungkan perangkat di atas untuk melihat plotnya'}</p>
            </TextContainer>
          </Stack>
        </Card.Section>
      )
    }
  }

  const opts = {
    height: '195',
    width: '320',
    playerVars: { // https://developers.google.com/youtube/player_parameters
      autoplay: false
    }
  };

  return (
    <React.Fragment>
      <Card title={specificTranslations.title}>
        <Card.Section>
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

export function renderSliders(setData, setSettings, status, Settings) {

  function resetPipeSetup(value) {
    buildPipe(Settings);
    setup(setData, Settings)
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

  function handleSliceFFTLowRangeSliderChange(value) {
    setSettings(prevState => ({ ...prevState, sliceFFTLow: value }));
    resetPipeSetup();
  }

  function handleSliceFFTHighRangeSliderChange(value) {
    setSettings(prevState => ({ ...prevState, sliceFFTHigh: value }));
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

