import React from 'react';
import { useLocation } from 'react-router-dom';

const result = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const top10Data = JSON.parse(queryParams.get('top10Data') || '[]');
  const classifiedData = JSON.parse(queryParams.get('classifiedData') || '{}');
  const classificationResult = queryParams.get('classificationResult') || '';

  return (
    <div>
      <h1>Data Received on New Page</h1>
      
      <h2>Top 10 Data</h2>
      <pre>{JSON.stringify(top10Data, null, 2)}</pre>

      <h2>Classified Data</h2>
      <pre>{JSON.stringify(classifiedData, null, 2)}</pre>

      <h2>Classification Result</h2>
      <p>{classificationResult}</p>
    </div>
  );
};

export default NewPage;
