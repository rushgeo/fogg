import { useState, useEffect } from 'react';

import {
  geoJsonFromLatLn,
  clearLeafletElementLayers,
  addLeafletMarkerLayer
} from '../lib/leaflet';
import { resolveLensAutocomplete } from '../lib/lens';
import { queryParamsToObject, objectToQueryString } from '../lib/util';

import { clearSearchComplete } from '../components/SearchComplete';

import { useFilters, useLocation } from '.';

const QUERY_SEARCH_PARAMS = ['q', 'properties'];

let hasRenderedOnce = false;

export default function useLens ({
  defaultCenter = {},
  resolveOnSearch,
  refMap,
  refMapDraw,
  refSearchComplete,
  availableFilters,
  zoom,
  defaultZoom,
  defaultDateRange = {}
}) {
  const defaultGeoJson =
    typeof geoJsonFromLatLn === 'function' && geoJsonFromLatLn(defaultCenter);

  const [date, setDate] = useState({
    dateIsOpen: false,
    date: defaultDateRange
  });
  const mapConfigDefaults = {
    center: defaultCenter,
    geoJson: defaultGeoJson,
    textInput: '',
    page: 1,
    marker: false
  };
  const [mapConfig, updateMapConfig] = useState(mapConfigDefaults);
  const [results, updateResults] = useState();
  const [moreResultsAvailable, updateMoreResultsAvailable] = useState();
  const [totalResults, updateTotalResults] = useState();

  const { search: locationSearch, history } = useLocation();

  const {
    filters,
    openFilters,
    storeFilterChanges,
    saveFilterChanges,
    setActiveFilters,
    cancelFilterChanges,
    clearActiveFilters
  } = useFilters(availableFilters);

  // On first render, parse any query params in the URL

  useEffect(() => {
    handleQueryParams();
  }, []);

  // We want to handle any of our map viewport changes using the leaflet element
  // rather than rerendering to prevent our props from overriding the map, and
  // generally this should help performance of having to rerender the whole map

  useEffect(() => {
    const { center } = mapConfig;
    if (!hasRenderedOnce) {
      setView(center, defaultZoom);
      hasRenderedOnce = true;
    } else {
      panTo(center);
    }
  }, [mapConfig.center, defaultZoom]);

  // We need to drop map markers using the effect hook as we don't always have the
  // leaflet element available via a ref if it's the first time rendering

  useEffect(() => {
    if (mapConfig.marker) {
      addSearchMarker(mapConfig.center);
    }
  }, [mapConfig.marker, mapConfig.center]);

  /**
   * handleDateChange
   * @description Handles date change events
   */
  function handleDateChange (date) {
    setDate(date);
  }

  /**
   * setView
   * @description Wraps the leaflet setView method and triggers on our map ref
   */

  function setView (center, zoom) {
    const { current = {} } = refMap;
    const { leafletElement = {} } = current;
    let mapZoom;

    // If we can find the existing zoom, use that to prevent changing the zoom
    // level on someone interacting with the map
    if (zoom) {
      mapZoom = zoom;
    } else {
      mapZoom = leafletElement.getZoom();
    }

    // Fly to our new (or old) center with the zoom

    leafletElement.setView(center, mapZoom);
  }

  /**
   * panTo
   * @description Wraps the leaflet panTo method and triggers on our map ref
   */

  function panTo (center) {
    const { current = {} } = refMap;
    const { leafletElement = {} } = current;
    leafletElement.panTo(center);
  }

  /**
   * search
   * @description Handle search functionality given layer settings and a date
   */

  function search ({
    layer = {},
    date: searchDate = date,
    textInput = mapConfig.textInput,
    page = 1,
    activeFilters = filters.active,
    dropMarker = false
  } = {}) {
    let { center = mapConfig.center, geoJson = mapConfig.geoJson } = layer;

    if (typeof geoJson === 'undefined') {
      geoJson = geoJsonFromLatLn(center);
    }

    const mapUpdate = {
      ...mapConfig,
      center,
      geoJson,
      textInput,
      page,
      marker: dropMarker
    };

    const params = {
      geoJson,
      date: searchDate.date ? searchDate.date : searchDate,
      textInput,
      page,
      filters: activeFilters
    };

    if (typeof resolveOnSearch === 'function') {
      resolveOnSearch(params).then(
        ({ features = [], hasMoreResults, numberOfResults } = {}) => {
          // If the page is greater than 1, we should append the results
          const baseResults = Array.isArray(results) && page > 1 ? results : [];
          const updatedResults = [...baseResults, ...features];
          updateResults(updatedResults);
          updateTotalResults(numberOfResults);
          updateMoreResultsAvailable(!!hasMoreResults);
        }
      );
    }

    updateMapConfig(mapUpdate);
  }

  /**
   * handleOnSearch
   * @description Fires when a search is performed via SearchComplete
   */

  function handleOnSearch (
    query = {},
    date,
    textInput,
    activeFilters = filters.active
  ) {
    // allow user to pass in query as {x,y} or {lng, lat}
    const { x, y, lng, lat } = query;

    if (
      (typeof x === 'undefined' || typeof y === 'undefined') &&
      (typeof lng === 'undefined' || typeof lat === 'undefined')
    ) {
      return;
    }

    const center = {
      lng: x || lng,
      lat: y || lat
    };

    search({
      layer: {
        geoJson: geoJsonFromLatLn(center),
        center
      },
      date,
      textInput,
      activeFilters,
      dropMarker: true
    });
  }

  /**
   * clearSearchLayers
   * @description Clears all marker instances on map
   */

  function clearSearchLayers () {
    const { current } = refMapDraw;
    const { leafletElement } = current || {};
    if (leafletElement) {
      clearLeafletElementLayers(leafletElement);
    }
  }

  /**
   * addSearchMarker
   * @description Adds a new marker at position on map, clears old
   */

  function addSearchMarker (position) {
    const { current } = refMapDraw;
    const { leafletElement } = current || {};
    if (leafletElement) {
      clearSearchLayers();
      addLeafletMarkerLayer(position, leafletElement);
    }
  }

  /**
   * handleOnCreated
   * @description Fires when a layer is created
   */

  function handleOnCreated (layer) {
    handleClearSearch({
      clearLayers: false
    });

    search({
      ...mapConfigDefaults,
      layer
    });
  }

  /**
   * handleLoadMoreResults
   * @description Triggers a new search request with an additional argument for page
   */

  function handleLoadMoreResults () {
    search({
      page: mapConfig.page + 1
    });
  }

  /**
   * handleUpdateSearchParams
   * @description Handles lens events upon updating any search params
   */

  function handleUpdateSearchParams ({ closeFilters = true }) {
    // Save and update any filter changes
    const updatedFilters = saveFilterChanges({ closeFilters });

    // Trigger a new search
    search({
      activeFilters: updatedFilters.active
    });
  }

  /**
   * handleClearActiveFilters
   * @description Handles lens events upon clearing active filters
   */

  function handleClearActiveFilters () {
    const updatedFilters = clearActiveFilters();
    search({
      activeFilters: updatedFilters.active
    });
  }

  /**
   * handleQueryParams
   * @description Pulls in search related query params and updates search
   */

  function handleQueryParams () {
    const urlParams = queryParamsToObject(locationSearch) || {};
    const urlQuery = urlParams.q;
    const availableFilters = filters.available;
    const properties = queryParamsToObject(urlParams.properties);
    const propertyKeys = properties && Object.keys(properties);

    let queryFilters = [];

    // Loops through any available properties and adds to available filters
    if (propertyKeys && propertyKeys.length > 0) {
      for (let property of propertyKeys) {
        let key = property;
        let value = properties[property];
        let id = `properties/${key}`;

        availableFilters.find(element => {
          if (element.id === id) {
            queryFilters.push({ id, value });
          }
          return element.id === id;
        });
      }
    }

    // If we have any available search params, trigger an autocomplete with
    // the query to grab the first match then trigger a search with it

    if (urlQuery || queryFilters.length > 0) {
      resolveLensAutocomplete(urlQuery).then(queryResults => {
        if (Array.isArray(queryResults)) {
          const { value } = queryResults[0];
          handleOnSearch(value, date, urlQuery, queryFilters);
          setActiveFilters(queryFilters);
        }
      });
    }
  }

  /**
   * clearQuerySearchParams
   * @description Remove all serach related query params from URL
   */

  function clearQuerySearchParams () {
    if (typeof locationSearch === 'undefined') return;
    const urlParams = queryParamsToObject(locationSearch);
    QUERY_SEARCH_PARAMS.forEach(param => {
      if (urlParams[param]) {
        delete urlParams[param];
      }
    });

    if (history) {
      history.pushState('', '', `?${objectToQueryString(urlParams)}`);
    }
  }

  /**
   * handleClearSearch
   * @description Clears all aspects of an active search from the state
   */

  function handleClearSearch ({ clearLayers = true } = {}) {
    const { current } = refSearchComplete;

    clearSearchComplete(current);
    clearQuerySearchParams();
    clearActiveFilters();
    updateResults(undefined);
    updateMoreResultsAvailable(false);
    updateMapConfig({
      ...mapConfigDefaults,
      center: mapConfig.center
    });
    setDate({});

    if (clearLayers) {
      clearSearchLayers();
    }
  }

  return {
    mapConfig,
    date,
    results,
    numberOfResults: totalResults,
    handlers: {
      handleOnCreated,
      handleOnSearch,
      resolveLensAutocomplete,
      handleUpdateSearchParams,
      loadMoreResults: moreResultsAvailable ? handleLoadMoreResults : undefined,
      clearActiveSearch: handleClearSearch,
      handleDateChange,
      refreshQueryParams: handleQueryParams
    },
    filters: {
      ...filters,
      handlers: {
        openFilters,
        saveFilterChanges,
        storeFilterChanges,
        cancelFilterChanges,
        clearActiveFilters: handleClearActiveFilters
      }
    }
  };
}
