import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import { Card, Stack, Button, ButtonGroup, Checkbox } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";
import * as translations from "./translations/en.json";
import * as generalTranslations from "./components/translations/en";
import { emptyAuxChannelData } from "./components/chartOptions";

import * as funSpectra from "./components/EEGEduSpectra/EEGEduSpectra";

const spectra = translations.types.spectra;

export function PageSwitcher() {
  // Pengaturan auxEnable
  const [checked, setChecked] = useState(false);
  const handleChange = useCallback((newChecked) => setChecked(newChecked), []);
  window.enableAux = checked;
  if (window.enableAux) {
    window.nchans = 5;
  } else {
    window.nchans = 4;
  }
  let showAux = true; // untuk memastikan bisa ditekan (mencegah penggunaan pada beberapa modul)

  // data yang ditarik dari multicast$
  const [spectraData, setSpectraData] = useState(emptyAuxChannelData); 

  // pengaturan pipa
  const [spectraSettings, setSpectraSettings] = useState(funSpectra.getSettings); 

  // status koneksi
  const [status, setStatus] = useState(generalTranslations.connect);

  // untuk memilih modul baru
  const [selected, setSelected] = useState(spectra);

  // untuk flag popup saat merekam
  const [recordPop, setRecordPop] = useState(false);
  const recordPopChange = useCallback(() => setRecordPop(!recordPop), [recordPop]);

  // untuk flag popup saat merekam kondisi kedua
  const [recordTwoPop, setRecordTwoPop] = useState(false);
  const recordTwoPopChange = useCallback(() => setRecordTwoPop(!recordTwoPop), [recordTwoPop]);

  switch (selected) {
    case spectra:
      showAux = true;
      break;
    default:
      console.log("Kesalahan pada showAux");
  }

  const chartTypes = [
    { label: spectra, value: spectra }, 

  ];

  function buildPipes(value) {
    funSpectra.buildPipe(spectraSettings);
  }

  function subscriptionSetup(value) {
    switch (value) {
      case spectra:
        funSpectra.setup(setSpectraData, spectraSettings);
        break;
      default:
        console.log(
          "Kesalahan pada pengaturan Subscriptions. Tidak bisa beralih ke: " + value
        );
    }
  }

  async function connect() {
    try {
      if (window.debugWithMock) {
        // Debug dengan Data EEG Mock
        setStatus(generalTranslations.connectingMock);
        window.source = {};
        window.source.connectionStatus = {};
        window.source.connectionStatus.value = true;
        window.source.eegReadings$ = mockMuseEEG(256);
        setStatus(generalTranslations.connectedMock);
      } else {
        // Koneksi dengan Muse EEG Client
        setStatus(generalTranslations.connecting);
        window.source = new MuseClient();
        window.source.enableAux = window.enableAux;
        await window.source.connect();
        await window.source.start();
        window.source.eegReadings$ = window.source.eegReadings;
        setStatus(generalTranslations.connected);
      }
      if (
        window.source.connectionStatus.value === true &&
        window.source.eegReadings$
      ) {
        buildPipes(selected);
        subscriptionSetup(selected);
      }
    } catch (err) {
      setStatus(generalTranslations.connect);
      console.log("Kesalahan koneksi: " + err);
    }
  }

  function refreshPage(){
    window.location.reload();
  }

  function pipeSettingsDisplay() {
    switch(selected) {
      case spectra:
        return (
          funSpectra.renderSliders(setSpectraData, setSpectraSettings, status, spectraSettings)
        );
      default: console.log('Kesalahan dalam menampilkan pengaturan');
    }
  }

  function renderModules() {
    switch (selected) {
      case spectra:
        return <funSpectra.renderModule data={spectraData} />;
      default:
        console.log("Kesalahan pada renderCharts switch.");
    }
  }
 
  // Tampilkan seluruh halaman menggunakan fungsi di atas
  return (
    <React.Fragment>
      <Card sectioned>
        <Stack>
          <ButtonGroup>
            {/* Tombol Connect dengan Bluetooth */}
            <Button
              primary={status === generalTranslations.connect}
              disabled={status !== generalTranslations.connect}
              onClick={() => {
                window.debugWithMock = false;
                connect();
              }}
            >
              {status}
            </Button>
              {/* buat tombol untuk menyelesaikan proses dan refresh halaman lalu kirim data ke function renderModule() */}
              {/* <Button onClick={handleDoneButtonClick}>Selesai</Button> */}

            {/* Tombol Putuskan Koneksi */}
            <Button
              destructive
              onClick={refreshPage}
              primary={status !== generalTranslations.connect}
              disabled={status === generalTranslations.connect}
            >
              {generalTranslations.disconnect}
            </Button>     
          </ButtonGroup>
          {/* Aktifkan Mode Auxi */}
          <Checkbox
            label="Aktifkan Saluran Bantu Muse"
            checked={checked}
            onChange={handleChange}
            disabled={!showAux || status !== generalTranslations.connect}
          />
        </Stack>
      </Card>
      {/* <Card title={translations.title} sectioned>
        <Select
          label={""}
          options={chartTypes}
          onChange={handleSelectChange}
          value={selected}
        />
      </Card> */}
      {pipeSettingsDisplay()}
      {renderModules()}
    </React.Fragment>
  );
}
