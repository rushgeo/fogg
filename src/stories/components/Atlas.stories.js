import React from 'react';
import PropTypes from 'prop-types';
import { storiesOf } from '@storybook/react';

import Atlas from '../../components/Atlas';
import ItemList from '../../components/ItemList';
import Panel from '../../components/Panel';

import Request from '../../models/request';

const stories = storiesOf('Components|Atlas', module);

const ALEXANDRIA = {
  lat: 38.8048,
  lng: -77.0469
};

const SidebarPanels = ({ results }) => {
  const hasResults = Array.isArray(results) && results.length > 0;

  return (
    <>
      {!hasResults && (
        <>
          <Panel header="Explore">
            <p>Explore stuff</p>
          </Panel>
          <Panel header="Past Searches">
            <ItemList
              items={[
                {
                  label: 'Alexandria, VA',
                  to: '#'
                },
                {
                  label: 'Montes Claros, MG',
                  to: '#'
                }
              ]}
            />
          </Panel>
        </>
      )}

      {hasResults && (
        <Panel header="Results">
          <ItemList items={results} />
        </Panel>
      )}
    </>
  );
};

SidebarPanels.propTypes = {
  results: PropTypes.array
};

stories.add('Default', () => {
  function handleResolveOnSearch ({ geoJson }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve([
          {
            label: `#1 from ${JSON.stringify(geoJson)}`,
            to: '#'
          },
          {
            label: `#2 from ${JSON.stringify(geoJson)} 2`,
            to: '#'
          }
        ]);
      }, 1000);
    });
  }

  return (
    <>
      <Atlas
        defaultCenter={ALEXANDRIA}
        zoom={3}
        resolveOnSearch={handleResolveOnSearch}
        SidebarComponents={SidebarPanels}
      />
    </>
  );
});

stories.add('SAT API', () => {
  async function handleResolveOnSearch ({ geoJson }) {
    console.log('geoJson', geoJson);

    let response;

    const request = new Request(
      'https://yzvdrl0zsc.execute-api.us-west-2.amazonaws.com/SIT/catalog/search'
    );

    request.setData({
      intersects: geoJson
    });

    request.setOptions({
      headers: {
        Accept: 'application/geo+json',
        'Content-Type': 'application/json'
      }
    });

    try {
      response = await request.post();
    } catch (e) {
      throw new Error(`Failed to get search results: ${e}`);
    }

    console.log('response', response);

    return [
      {
        label: `#1 from ${JSON.stringify(geoJson)}`,
        to: '#'
      },
      {
        label: `#2 from ${JSON.stringify(geoJson)} 2`,
        to: '#'
      }
    ];
  }

  return (
    <>
      <Atlas
        defaultCenter={ALEXANDRIA}
        zoom={3}
        resolveOnSearch={handleResolveOnSearch}
        SidebarComponents={SidebarPanels}
      />
    </>
  );
});
