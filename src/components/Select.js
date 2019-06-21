import React from 'react';
import PropTypes from 'prop-types';
import { FaCaretDown } from 'react-icons/fa';

import { useInput } from '../hooks';

const Select = ({ className, props, onChange, onInput }) => {
  const { options, inputProps } = useInput({ props });

  const { placeholder } = inputProps;

  return (
    <div className="select">
      <select
        className={`select ${className}`}
        onChange={onChange}
        onInput={onInput}
        {...inputProps}
      >
        <option value="">{placeholder || '- Please Select -'}</option>

        {Array.isArray(options) &&
          options.map((option, index) => {
            return (
              <option key={`Select-Option-${index}`} value={option.value}>
                {option.label}
              </option>
            );
          })}
      </select>
      <FaCaretDown />
    </div>
  );
};

Select.propTypes = {
  className: PropTypes.string,
  props: PropTypes.object,
  onChange: PropTypes.func,
  onInput: PropTypes.func
};

export default Select;
