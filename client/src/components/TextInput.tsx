import classNames from "classnames";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

type TextInputProps = {
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
};

// This is used for rendering input fields on our forms and allows for registration with react hook forms
export default function TextInput({
  label,
  type = "text",
  defaultValue = "",
  placeholder,
  registration,
  error,
}: TextInputProps) {
  const inputId = registration.name;

  return (
    <>
      <label className="label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={classNames("input w-full", {
          "input-error": error,
        })}
        {...registration}
      />
      {error && <p className="label text-red-400 mb-0">{error.message}</p>}
    </>
  );
}
