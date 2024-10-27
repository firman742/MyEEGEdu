import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card } from "@shopify/polaris";
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

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

export function getSettings() {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    interval: 100,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 30,
    duration: 1024,
    srate: 256,
    name: 'Alpha',
    secondsToSave: 60
  }
};

const conds = ['Open', 'Closed'];
const thisRand = Math.floor(Math.random() * 2); 
const firstType = conds[thisRand];


export function buildPipe(Settings) {
  if (window.subscriptionAlpha) window.subscriptionAlpha.unsubscribe();

  window.pipeAlpha$ = null;
  window.multicastAlpha$ = null;
  window.subscriptionAlpha = null;

  // Build Pipe 
  window.pipeAlpha$ = zipSamples(window.source.eegReadings$).pipe(
    bandpassFilter({ 
      cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh], 
      nbChannels: window.nchans }),
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

  window.multicastAlpha$ = window.pipeAlpha$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);
// Dataset berhasil didapat
      // Todo: Buat Array baru 
      /**
       * Misal:
       * 
       * Kita punya 100 frequensi, sehingga data yang disimpan adalah:
       * xValues= ['2','4','2','10', '89', '50', ..., ..., '82', .., .., '0'];
       * yValues= ['0','1','2','3', '4', '5', ..., ..., '75', .., .., '100'];
       * 
       * Coba nanti cari cara gimana biar data yang ditangkap itu semua channel
       * 
       * 
       * NB:
       * - Untuk datanya diambil dari ke empat channel tadi dan dikumpulkan jadi 1, nanti ambil data xValues dan liat itu dari yValues yang mana
       * - Misal dengan 400 Data tadi yang diambil adalah cukup xValuesnya, nanti dari xValues bisa dicari tau itu berada di frequensi yang mana (yValues)
       *  xValues= [['2','4','2','10', '89', '50', ..., ..., '82', .., .., '0'], ['2','4','2','10', '89', '50', ..., ..., '82', .., .., '0'], ['2','4','2','10', '89', '50', ..., ..., '82', .., .., '0'], ....];
       *  yValues= [['0','1','2','3', '4', '5', ..., ..., '75', .., .., '100'], ['0','1','2','3', '4', '5', ..., ..., '75', .., .., '100'], ['0','1','2','3', '4', '5', ..., ..., '75', .., .., '100'], ...];
       */

      
      // Todo: Kumpulkan Data ke dalam Array
      // Todo: Buat Fungsi baru untuk mengambil array dan menghitung 10 data terbesar
      // Todo: Buat Fungsi Baru untuk melakukan klasifikasinya

  if (window.multicastAlpha$) {
    window.subscriptionAlpha = window.multicastAlpha$.subscribe(data => {
      setData(alphaData => {
        Object.values(alphaData).forEach((channel, index) => {
          channel.datasets[0].data = data.psd[index];
          channel.xLabels = data.freqs;
        });

        return {
          ch0: alphaData.ch0,
          ch1: alphaData.ch1,
          ch2: alphaData.ch2,
          ch3: alphaData.ch3,
          ch4: alphaData.ch4
        };
      });
    });

    window.multicastAlpha$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function renderModule(channels) {
  // TP9
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
                max: 25,
                min: 0
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
          text: generalTranslations.channel + channelNames[index]
        }
      };

        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
          </Card.Section>
        );
      } else {
        return null
      }
    });
  }

  // AF7
  function renderCharts1() {
    return Object.values(channels.data).map((channel, index) => {
      if (index === 1) {
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
                max: 25,
                min: 0
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
          text: generalTranslations.channel + channelNames[index]
        }
      };

        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
          </Card.Section>
        );
      } else {
        return null
      }
    });
  }

  // AF8
  function renderCharts2() {
    return Object.values(channels.data).map((channel, index) => {
      if (index === 2) {
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
                max: 25,
                min: 0
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
          text: generalTranslations.channel + channelNames[index]
        }
      };

        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
          </Card.Section>
        );
      } else {
        return null
      }
    });
  }

  // TP10
  function renderCharts3() {
    return Object.values(channels.data).map((channel, index) => {
      if (index === 3) {
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
                max: 25,
                min: 0
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
          text: generalTranslations.channel + channelNames[index]
        }
      };

        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
          </Card.Section>
        );
      } else {
        return null
      }
    });
  }

  return (
    <Card title={specificTranslations.title}>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts1()}</div>
      </Card.Section>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts2()}</div>
      </Card.Section>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts3()}</div>
      </Card.Section>


      {/* New Card for Classification Description */}
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
    </Card>
  );
}