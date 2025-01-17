import React from 'react';
import { shallow } from 'enzyme';

import MapPreview from './';

import featureCollection from '../../../tests/fixtures/feature-collection.json';

const ALEXANDRIA = {
  lat: 38.8048,
  lng: -77.0469
};

const ALEXANDRIA_COORDINATES = [ALEXANDRIA.lat, ALEXANDRIA.lng];

describe('MapPreview', () => {
  describe('Center Point', () => {
    const mapPreview = shallow(<MapPreview center={ALEXANDRIA} />);
    const map = mapPreview.find('MapWithRefs');

    it('should render a Map component', () => {
      expect(map).toHaveLength(1);
    });

    it('should pass the Map component coordinate props', () => {
      expect(map.prop('center')).toEqual(ALEXANDRIA_COORDINATES);
    });

    it('should pass the MapMarker component coordinate props', () => {
      expect(mapPreview.find('MapMarker').prop('position')).toEqual(
        ALEXANDRIA_COORDINATES
      );
    });

    it('should display the coordinates of the component', () => {
      const mapPreviewCoordinates = mapPreview.find('.map-preview-coordinates');
      const mapPreviewText = mapPreviewCoordinates.text();
      expect(mapPreviewText).toEqual(
        `Coordinates (Latitude & Longtitude): ${ALEXANDRIA.lat}, ${ALEXANDRIA.lng}`
      );
    });
  });

  describe('Polygon Shape', () => {
    const mapPreview = shallow(<MapPreview geoJson={featureCollection} />);
    const map = mapPreview.find('MapWithRefs');
    const mapPreviewPolygon = mapPreview.find('ForwardRef(Leaflet(Polygon))');
    const fcCoordinates = featureCollection.features[0].geometry.coordinates[0];
    const fcCoordinatesReverse = fcCoordinates.map((set) => [set[1], set[0]]);
    const fcCoordinatesFirst = fcCoordinates[0];
    const fcCoordinatesLast = fcCoordinates[fcCoordinates.length - 1];

    it('should render a Map component', () => {
      expect(map).toHaveLength(1);
    });

    it('should pass the MapMarker component coordinate props', () => {
      expect(mapPreviewPolygon.prop('positions')).toEqual(fcCoordinatesReverse);
    });

    it('should display the coordinates of the collection shapes', () => {
      const mapPreviewCoordinates = mapPreview.find('.map-preview-coordinates');
      const mapPreviewCoordinatesListItems = mapPreviewCoordinates.find('li');
      const firstCoordinates = mapPreviewCoordinatesListItems.first();
      const lastCoordinates = mapPreviewCoordinatesListItems.first();
      expect(firstCoordinates.text()).toEqual(
        `${fcCoordinatesFirst[1]}, ${fcCoordinatesFirst[0]}`
      );
      expect(lastCoordinates.text()).toEqual(
        `${fcCoordinatesLast[1]}, ${fcCoordinatesLast[0]}`
      );
    });
  });
});
