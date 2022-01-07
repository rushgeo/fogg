import React from 'react';
import PropTypes from 'prop-types';
import { FaTimesCircle } from 'react-icons/fa';

import ClassName from '../../models/classname';

const TableSearchInput = ({
  className,
  value,
  onChange,
  onClear,
  onSubmit,
  placeholder = 'Search Table',
  ...rest
}) => {
  const componentClass = new ClassName('table-search-input');

  if (className) componentClass.add(className);

  const hasValue = typeof value === 'string' && value.length > 0;

  /**
   * handleOnChange
   */

  function handleOnChange (e) {
    if (typeof onChange === 'function') {
      onChange(e);
    }
  }

  /**
   * handleOnClear
   */

  function handleOnClear (e) {
    if (typeof onClear === 'function') {
      onClear(e);
    }
  }

  /**
   * handleKeyPress
   */

  function handleKeyPress (e) {
    if (onSubmit && e.key === 'Enter') {
      onSubmit(value);
    }
  }

  return (
    <span className={componentClass.string}>
      <input
        type="text"
        value={value || ''}
        onChange={handleOnChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        {...rest}
      />
      {hasValue && (
        <button
          className={componentClass.childString('clear')}
          onClick={handleOnClear}
          onKeyPress={handleOnClear}
        >
          <FaTimesCircle />
        </button>
      )}
    </span>
  );
};

TableSearchInput.propTypes = {
  className: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onClear: PropTypes.func,
  onSubmit: PropTypes.func,
  placeholder: PropTypes.string
};

export default TableSearchInput;
