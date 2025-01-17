import React, { useState } from 'react';
import Fuse from 'fuse.js';

import { sortByKey } from '../lib/util';

import Button from '../components/Button';
import IconByName from '../components/IconByName';

const SORT_TYPES = ['none', 'asc', 'desc'];

const DEFAULT_SORT_OPTIONS = {
  sortedIndex: 0,
  sortType: 'none',
  sortId: null
};

const FILTER_KEY = '$$filterable';

const errorBase = 'Failed to construct table data';

export const CELL_ORIGINAL_VALUE_POSTFIX = '/orig';

export default function useTableData ({ columns = [], data = [] }) {
  let workingColumns = [...columns];
  let workingData = [...data];

  /*************************
   * SEARCHING / FILTERING *
   *************************/

  const [filters, updateFilters] = useState({});

  const filtersArray = Object.keys(filters).map((key) => filters[key]);

  const filterKeys = columns
    .filter(({ canFilter = true } = {}) => !!canFilter)
    .map(({ columnId } = {}) => columnId);

  if (filterKeys.find((key) => typeof key === 'undefined')) {
    throw new Error(`${errorBase}: Columns contain undefined columnId`);
  }

  // Find all columns that have a filter transformer and create a filter friendly key
  // on the working data

  workingColumns.forEach(({ columnId, filterTransformer } = {}) => {
    if (!filterTransformer) return;

    const key = `${columnId}${FILTER_KEY}`;
    const columnIdIndex = filterKeys.indexOf(columnId);

    // First remove the actual key from our filter keys array as we don't
    // want it to be search on

    filterKeys.splice(columnIdIndex, 1);

    // Next push our temporary key which will allow us perform a user friendly search

    filterKeys.push(key);

    workingData = workingData.map((set) => {
      let value = filterTransformer(set[columnId]);

      value = sanitizeFilterValue(value);

      return {
        ...set,
        [key]: value
      };
    });
  });

  filtersArray.forEach((filter = {}) => {
    const { filterType, filterColumnId } = filter;
    let { filterValue } = filter;

    if (filterType === 'search') {
      filterValue = sanitizeFilterValue(filterValue);

      const fuse = new Fuse(workingData, {
        findAllMatches: true,
        threshold: 0.2,
        keys: filterKeys
      });
      let search;

      if (filterValue) {
        search = fuse.search(filterValue);
      }

      if (Array.isArray(search)) {
        workingData = search.map(({ item }) => item);
      }

      return;
    }

    if (filterType === 'checklist') {
      workingData = workingData.filter((row) => {
        let rowValue = row[filterColumnId];

        if (!Array.isArray(rowValue)) rowValue = [rowValue];
        if (!Array.isArray(filterValue)) filterValue = [filterValue];

        // Assuming our row HAS the value, if we determine that it doesn't
        // then we want to set it to not be included. This allows us to
        // set the filters to drill down, requiring each option checked to
        // be true, rather than only 1 option to be true

        let rowHasValue = true;

        filterValue.forEach((value) => {
          if (!rowValue.includes(value)) {
            rowHasValue = false;
          }
        });

        return rowHasValue;
      });
    }
  });

  // Now that we have searched our data, loop back through our data and
  // remove our temporary filter key

  workingData = workingData.map((set) => {
    const keysToStrip = Object.keys(set).filter((key) =>
      key.includes(FILTER_KEY)
    );

    const data = {
      ...set
    };

    keysToStrip.forEach((key) => {
      delete data[key];
    });

    return data;
  });

  // Return our filter keys to the original state before our temporary filterable key

  filterKeys.map((key) => key.replace(FILTER_KEY, ''));

  /***********
   * SORTING *
   ***********/

  const defaultSortOptions = {
    ...DEFAULT_SORT_OPTIONS
  };

  // Try to see if we're designating a column as sorted by default

  const defaultSortColumn = columns.findIndex(
    ({ defaultSorted }) => !!defaultSorted
  );

  // If we find one, override the default sort option config

  if (defaultSortColumn >= 0) {
    defaultSortOptions.sortedIndex = defaultSortColumn;
    defaultSortOptions.sortType = columns[defaultSortColumn].defaultSorted;
    defaultSortOptions.sortId = columns[defaultSortColumn].columnId;
  }

  const [sortOptions, updateSortOptions] = useState(defaultSortOptions);
  const { sortedIndex, sortType, sortId } = sortOptions;

  // Map our our sort state and tag the column header with the appropriate
  // sort status

  workingColumns = workingColumns.map((column = {}, index) => {
    const isSorted = sortedIndex === index;

    if (!isSorted) return column;

    return {
      ...column,
      isSorted: true,
      sortType
    };
  });

  // Perform sorting on our row data

  if (sortType !== 'none' && sortId) {
    workingData = sortByKey(workingData, sortId, sortType);
  }

  /***********
   * MAPPING *
   ***********/

  // Loop through all of our data and populate any columns that require actions

  workingData = workingData.map((data = {}) => {
    const { actions = [] } = data;
    const actionComponents = [];

    if (Array.isArray(actions)) {
      actions.forEach(
        ({ to, label, buttonType, icon, ...rest } = {}, index) => {
          const hasType =
            Array.isArray(buttonType) || typeof buttonType === 'string';
          const iconBefore = hasType && buttonType.includes('icon-before');
          const iconAfter = hasType && buttonType.includes('icon-after');

          if (typeof icon === 'string') {
            icon = <IconByName name={icon} />;
          }

          const action = (
            <Button
              key={`Action-${index}`}
              to={to && to}
              type={buttonType}
              {...rest}
            >
              {iconBefore && icon}
              {label}
              {iconAfter && icon}
            </Button>
          );

          actionComponents.push(action);
        }
      );
    }
    return {
      ...data,
      actions: actionComponents
    };
  });

  // Loop through all of our data and tranform any cells that have a custom cellTransformer

  workingData = workingData.map((data = {}) => {
    const dataOriginal = { ...data };
    const dataKeys = Object.keys(data) || [];

    dataKeys.forEach((key) => {
      const column = workingColumns.find(
        ({ columnId } = {}) => columnId === key
      );
      const { cellTransformer } = column || {};
      if (typeof cellTransformer === 'function') {
        data[`${key}${CELL_ORIGINAL_VALUE_POSTFIX}`] = data[key];
        data[key] = cellTransformer(data[key], {
          data: dataOriginal
        });
      }
    });

    return data;
  });

  /**
   * handleSort
   */

  function handleSort ({ columnIndex, columnId } = {}) {
    updateSortOptions((prev) => {
      const { sortType: prevSortType, sortedIndex } = prev;
      const isSameColumn = sortedIndex === columnIndex;
      const nextSortType = isSameColumn
        ? getNextSortType(prevSortType)
        : SORT_TYPES[1];
      return {
        ...prev,
        sortedIndex: columnIndex,
        sortType: nextSortType,
        sortId: columnId
      };
    });
  }

  /**
   * handleFilter
   */

  function handleFilter (filter = {}, cell = {}) {
    const { value: filterValue } = filter;
    const {
      filterType: cellFilterType = 'search',
      columnId: cellFilterColumnId
    } = cell;

    const activeFilter = filtersArray.find((filterItem = {}) => {
      const { filterType = 'search', filterColumnId } = filterItem;
      const isType = filterType === cellFilterType;

      if (filterType === 'search') return isType;

      return isType && filterColumnId === cellFilterColumnId;
    });

    const activeIndex = filtersArray.indexOf(activeFilter);

    if (!activeFilter) {
      const updatedFiltersArray = [
        ...filtersArray,
        {
          filterColumnId: cellFilterColumnId,
          filterType: cellFilterType,
          filterValue
        }
      ];

      const updatedFiltersState = {};

      updatedFiltersArray.forEach((filter, index) => {
        updatedFiltersState[index] = filter;
      });

      updateFilters(updatedFiltersState);
    } else {
      updateFilters((prev) => {
        return {
          ...prev,
          [activeIndex]: {
            ...prev[activeIndex],
            filterValue
          }
        };
      });
    }
  }

  /**
   * handleClearFilters
   */

  function handleClearFilters () {
    updateFilters({});
  }

  return {
    columns: workingColumns,
    data: workingData,
    sort: handleSort,
    filter: handleFilter,
    clearFilters: handleClearFilters,
    filters: filtersArray,
    filterKeys
  };
}

/**
 * getNextSortType
 */

function getNextSortType (currentType) {
  if (!currentType) return SORT_TYPES[0];

  const typeIndex = SORT_TYPES.indexOf(currentType);

  return SORT_TYPES[typeIndex + 1] || SORT_TYPES[0];
}

function sanitizeFilterValue (query = '') {
  if (typeof query !== 'string') return query;
  return query.replace(/\//g, '');
}
