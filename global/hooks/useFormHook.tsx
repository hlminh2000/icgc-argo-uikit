import React, { useState } from 'react';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import isArray from 'lodash/isArray';
import yup from 'global/utils/validations';

type DefaultDataShape = { [k: string]: any };

type FormData<T extends DefaultDataShape> = {
  key: keyof T;
  val: unknown;
};

/**
 * Supports single forms only, {} not [{},{}]
 */
interface T_FormHookInput<T extends DefaultDataShape> {
  initialFields: T;
  schema: yup.ObjectSchema<T>;
}
function useFormHook<T extends DefaultDataShape>({
  initialFields,
  schema: formSchema,
}: T_FormHookInput<T>) {
  let initErrors: DefaultDataShape = {};

  for (let [key, value] of Object.entries(initialFields)) {
    initErrors[key] = '';
  }
  const initialState = {
    errors: initErrors,
    data: initialFields,
  };

  const [form, setForm] = useState<{ errors: typeof initErrors; data: typeof initialFields }>(
    initialState,
  );

  const { errors, data } = form;

  const hasErrors = Object.values(errors).some(x => x);

  // set form data
  const setData = ({ key, val }: FormData<T>) => {
    setForm({
      ...form,
      data: { ...data, [key]: val },
    });
  };

  // set all errors
  const setErrors = ({ validationErrors }) =>
    setForm({
      ...form,
      errors: { ...errors, ...validationErrors },
    });

  // set single error
  const setError = ({ key, val }: FormData<T>) => {
    setForm({
      ...form,
      errors: { ...errors, [key]: String(val) },
    });
  };

  // validate a single field
  const validateField = async ({ key }: { key: string }) => {
    try {
      const value = await yup.reach(formSchema, key).validate(data[key]);
      setError({ key, val: '' });
    } catch (fieldError) {
      const message =
        isArray(fieldError.inner) && fieldError.inner.length > 1
          ? fieldError.inner[fieldError.inner.length - 1].message
          : fieldError.message;

      setError({ key, val: message });
    }
  };

  // validates entire form
  const validateForm = (): ReturnType<typeof formSchema.validate> =>
    new Promise(async (resolve, reject) => {
      try {
        const validData = await formSchema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
        });

        resolve(validData);
      } catch (formErrors) {
        const validationErrors = get(formErrors, 'inner', []).reduce((output, error) => {
          output[error.path] = error.message;
          return output;
        }, {});

        setErrors({ validationErrors });
        reject(validationErrors);
      }
    });

  const reset = () => {
    setForm(initialState);
  };

  const typedData: T = data;

  return {
    errors,
    setError,
    data: typedData,
    setData,
    validateField,
    validateForm,
    touched: !isEqual(initialFields, form.data),
    hasErrors,
    reset,
  };
}

export default useFormHook;
