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
  const [data, setData] = useState(null); // Step 1: Define state for data

  // const [top10Data, setTop10Data] = useState(null);

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

  function disconnect() {
    if (window.debugWithMock) {
      window.source = {};
      window.source.connectionStatus.value = false;
    } else {
      window.source.disconnect(); // Assuming this method exists to disconnect.
    }
  }

  function pipeSettingsDisplay() {
    switch (selected) {
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

  function handleDoneButtonClick() {
    const calculateClassification = funSpectra.ResultClassificationData();
    let description = "";
    let learningMethod = "";

    if (calculateClassification === 'KESIAPAN TINGGI') {
      description = 'Siswa menunjukkan kesiapan tinggi untuk menerima pelajaran.';
    } else if (calculateClassification === 'KESIAPAN SEDANG') {
      description = 'Siswa memiliki kesiapan sedang. Dapat diberikan lebih banyak motivasi.';
    } else if (calculateClassification === 'KESIAPAN RENDAH') {
      description = 'Siswa membutuhkan perhatian lebih untuk meningkatkan kesiapan belajar.';
    } else {
      description = "-"
    }

    if (calculateClassification === 'KESIAPAN TINGGI') {
      learningMethod = 'Metode pembelajaran yang lebih interaktif seperti diskusi atau praktik akan efektif.';
    } else if (calculateClassification === 'KESIAPAN SEDANG') {
      learningMethod = 'Metode pembelajaran berbasis proyek dengan tambahan motivasi bisa membantu siswa.';
    } else if (calculateClassification === 'KESIAPAN RENDAH') {
      learningMethod = 'Pendekatan yang lebih personal dan penggunaan metode visualisasi dapat meningkatkan kesiapan belajar.';
    } else {
      learningMethod = '-';
    }

    const data = {
      calculateClassification,
      description,
      learningMethod,
    };

    setData(data);
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

            {/* Button Connect with Mock Data */}
            <Button
              disabled={status !== generalTranslations.connect}
              onClick={() => {
                window.debugWithMock = true;
                connect();
              }}
            >
              {status === generalTranslations.connect ? generalTranslations.connectMock : status}
            </Button>

            {/* Button Finish */}
            <Button
              destructive
              onClick={() => {
                handleDoneButtonClick();
                disconnect();
              }}
              primary={status !== generalTranslations.connect}
              disabled={status === generalTranslations.connect}
            >
              Finish
            </Button>

            {/* Tombol Putuskan Koneksi */}
            {/* <Button
              destructive
              onClick={refreshPage}
              primary={status !== generalTranslations.connect}
              disabled={status === generalTranslations.connect}
            >
              {generalTranslations.disconnect}
            </Button> */}
          </ButtonGroup>
          {/* Aktifkan Mode Auxi */}
          {/* <Checkbox
            label="Aktifkan Saluran Bantu Muse"
            checked={checked}
            onChange={handleChange}
            disabled={!showAux || status !== generalTranslations.connect}
          /> */}
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
      {/* Tampilkan seluruh data dari top10Data dalam bentuk list */}
      <Card title={translations.classification} sectioned>
        {data && (
          <div>
            <h1 style={{ fontSize: "30px" }}><b>{JSON.stringify(data.calculateClassification, null, 2)}</b></h1>
            <br></br>
            <h2>{JSON.stringify(data.description, null, 2)}</h2>
            <br></br>
            <h2><b>Metode Pembelajaran yang perlu diterapkan:</b> {JSON.stringify(data.learningMethod, null, 2)}</h2>
          </div>
        )}
      </Card>

      <pre style={{ fontSize: "10px", alignContent: "center", textAlign: "center" }}>Pengabdian dengan dukungan Kemendibudristek 2024</pre>
    </React.Fragment>
  );
}
