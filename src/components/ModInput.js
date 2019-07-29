import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaPencilAlt, FaCheck, FaTimes } from 'react-icons/fa';

import { useModValue } from '../hooks';
import Logger from '../lib/logger';

import FormInput from './FormInput';
import Button from './Button';
import { ModFormContext } from '../context';

const logger = new Logger('ModInput', {
  isBrowser: true
});

const ModInput = ({ id, name, defaultValue = '', onSave, label }) => {
  const inputName = name || id;

  if (!inputName) {
    logger.warn(`Missing input name`);
  }

  const {
    isChangeable,
    updateChangeable,
    originalValue,
    updateOriginalValue,
    value,
    updateValue
  } = useModValue(defaultValue);

  const { updateField, isFormEditable, isAllFieldsEditable, shouldSaveForm } =
    useContext(ModFormContext) || {};

  useEffect(() => {
    updateField(inputName, isChangeable);
  }, [isChangeable]);

  useEffect(() => {
    if (isFormEditable && isAllFieldsEditable) {
      // if all fields are editable, we can set isChangeable
      // to true for all fields
      updateChangeable(true);
    }

    if (!isFormEditable) {
      updateChangeable(false);
      // if the form isn't editable, then not fields should have
      // isChangeable set to true. we want to save the fields that
      // should be saved and clear the changes if not
      if (shouldSaveForm) {
        handleOnSave();
      } else {
        updateValue(originalValue);
      }
    }
  }, [isFormEditable, isAllFieldsEditable]);

  let icon = isChangeable ? <FaCheck /> : <FaPencilAlt />;

  /**
   * handleChangeClick
   * @description Fires when editable state change toggle is clicked. If the toggle state
   *     is going from changeable and is saving, it will trigger a save event
   */

  function handleChangeClick (e) {
    e.preventDefault();
    const shouldSave = !!isChangeable;
    updateChangeable(!isChangeable);
    if (shouldSave) {
      handleOnSave();
    }
  }

  /**
   * handleCancelClick
   * @description Fires when the editable state is canceled. Reverts value to last saved value
   */

  function handleCancelClick () {
    updateValue(originalValue);
    updateChangeable(!isChangeable);
  }

  /**
   * handleOnInputchange
   * @description Fires when form input has been modified
   */

  function handleOnInputchange ({ target } = {}) {
    updateValue(target.value || '');
  }

  /**
   * handleOnSave
   * @description Manages save events. Updates "original" value and triggers onSave
   */

  function handleOnSave () {
    updateOriginalValue(value);
    if (typeof onSave === 'function') {
      onSave(value, inputName);
    }
  }

  useEffect(() => {
    updateOriginalValue(defaultValue);
    updateValue(defaultValue);
  }, [defaultValue]);

  const formInputProps = {
    id,
    label,
    name: inputName,
    value: isChangeable ? value : originalValue,
    onChange: handleOnInputchange,
    disabled: !isChangeable
  };

  return (
    <div className="mod-input" data-modinput-is-changeable={!!isChangeable}>
      <div className="mod-input-value">
        <FormInput {...formInputProps} />
      </div>
      <div className="mod-input-actions">
        {isChangeable && (
          <Button
            className="button-circle mod-input-cancel"
            onClick={handleCancelClick}
          >
            <FaTimes />
          </Button>
        )}
        <Button className="button-circle" onClick={handleChangeClick}>
          {icon}
        </Button>
      </div>
    </div>
  );
};

ModInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  defaultValue: PropTypes.string,
  onSave: PropTypes.func
};

export default ModInput;
