import { Link, useLocation, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useState } from "react";
import { z } from "zod";
import ErrorMessage from "./components/ErrorMessage";
import TextInput from "./components/TextInput";

const Register = () => {
  // Describe the valid format for a registration form (including validating passwords match)
  const registerSchema = z
    .object({
      email: z.email("Please provide a valid email address"),
      password: z
        .string()
        .min(8, "Your password must be at least 8 characters long"),
      passwordConfirm: z.string(),
      displayName: z
        .string()
        .trim()
        .min(1, "Your display name is required")
        .max(100, "Your display name must be 100 characters or fewer"),
    })
    // This checks that the two password fields are identical and puts out an error on password confirm
    .refine((data) => data.password === data.passwordConfirm, {
      message: "Please ensure that your passwords match",
      path: ["passwordConfirm"],
    });

  // Infer the layout of our form from the zod schema
  type RegisterForm = z.infer<typeof registerSchema>;
  // Used for the display of more generic errors (identified server side)
  const [serverError, setServerError] = useState("");
  // Used to navigate to the welcome page after registration
  const navigate = useNavigate();
  // Used for getting query params
  const { search } = useLocation();

  // The logic for handling the submit of the form
  const onSubmit = async (data: RegisterForm) => {
    setServerError("");

    try {
      await axios.post("/api/users", data);
      navigate(`/login${search}`, {
        state: {
          message:
            "Thank you for registering as a member, you can now log in below.",
        },
      });
      // Catch any errors
    } catch (error: unknown) {
      // Look for any specific axios errors which have a string message
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setServerError(
          error.response?.data?.message ?? "An unexpected error has occurred.",
        );
        return;
      }
      // If we get another type of error then just put out a generic error message
      setServerError("An unexpected error has occurred.");
    }
  };

  // Define the fields in the form so they can be rendered with components later
  const fields = [
    {
      name: "email" as const,
      label: "Email Address",
      placeholder: "example@example.com",
    },
    {
      name: "displayName" as const,
      label: "Display Name",
      placeholder: "Your Name",
    },
    {
      name: "password" as const,
      label: "Password",
      placeholder: "Password",
      type: "password",
    },
    {
      name: "passwordConfirm" as const,
      label: "Confirm Password",
      placeholder: "Confirm Password",
      type: "password",
    },
  ];

  // Take the required functions from react-hook-forms and register our zod resolver for client side validation
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  return (
    <div className="flex flex-col">
      {
        // Introductory text
      }
      <h1>Register</h1>
      <p>
        To sign up for a new account, please fill in the form below. You will
        log in using your email address, and this will give you access to all of
        the sites on richardpjames.com
      </p>
      {
        // Any generic error messages from the server
      }
      <ErrorMessage>{serverError}</ErrorMessage>
      {
        // The registration form
      }
      <form className="mx-auto w-full" onSubmit={handleSubmit(onSubmit)}>
        <fieldset className="fieldset w-full">
          {
            // Loop through the list of fields and render them out
          }
          {fields.map(({ name, label, placeholder, type }) => (
            <TextInput
              key={name}
              label={label}
              placeholder={placeholder}
              type={type}
              registration={register(name)}
              error={formErrors[name]}
            />
          ))}
        </fieldset>
        {
          // Buttons for submitting and going to the login page
        }
        <button className="btn btn-primary mt-5" disabled={isSubmitting}>
          Register{" "}
          {isSubmitting && (
            <span className="loading loading-spinner loading-xs"></span>
          )}
        </button>
        <Link to={`/login${search}`} className="btn btn-neutral mt-5 ml-2">
          Already a Member?
        </Link>
      </form>
    </div>
  );
};

export default Register;
