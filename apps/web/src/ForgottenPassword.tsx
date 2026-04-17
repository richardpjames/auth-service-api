import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextInput from './components/TextInput';
import z from 'zod';
import ErrorMessage from './components/ErrorMessage';
import { useState } from 'react';
import axios from 'axios';
import { useMe } from './hooks/useMe';

const ForgottenPassword = () => {
  // Describe the valid format for a forgotten password form
  const forgottenPasswordSchema = z.object({
    email: z.email('Please provide a valid email address'),
  });

  // Infer the layout of our form from the zod schema
  type ForogottenPasswordForm = z.infer<typeof forgottenPasswordSchema>;

  // Used to display any messages from the process and getting query params
  const location = useLocation();
  const { search } = location;

  // Used to get query parameters
  const [searchParams] = useSearchParams();

  // Used for the display of more generic errors (identified server side)
  const [serverError, setServerError] = useState('');

  // Get the user details from the /api/me endpoint
  const { user, isLoading } = useMe();

  //Navigate away if there is a user
  const navigate = useNavigate();
  if (!isLoading && user) {
    navigate('/loggedin');
  }

  // The logic for handling the submit of the form
  const onSubmit = async (data: ForogottenPasswordForm) => {
    // Reset any error messages
    setServerError('');

    try {
      await axios.post(`/api/forgottenpassword${search}`, {
        ...data,
        client_id: searchParams.get('client_id'),
        redirect_uri: searchParams.get('redirect_uri'),
        state: searchParams.get('state'),
        returnTo: searchParams.get('returnTo'),
      });
      // Redirect to the confirmation page
      navigate(`/forgottenpasswordconfirm${search}`);
      // Catch any errors
    } catch (error: unknown) {
      // Look for any specific axios errors which have a string message
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setServerError(
          error.response?.data?.message ?? 'An unexpected error has occurred.',
        );
        return;
      }
      // If we get another type of error then just put out a generic error message
      setServerError('An unexpected error has occurred.');
    }
  };

  // Define the fields in the form so they can be rendered with components later
  const fields = [
    {
      name: 'email' as const,
      label: 'Email Address',
      placeholder: 'example@example.com',
      defaultValue: searchParams.get('email') || '',
    },
  ];

  // Take the required functions from react-hook-forms and register our zod resolver for client side validation
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<ForogottenPasswordForm>({
    resolver: zodResolver(forgottenPasswordSchema),
    mode: 'onBlur',
  });

  if (isLoading) {
    return <></>;
  }

  return (
    <div className="flex flex-col w-full">
      <h1>Forgotten Password</h1>
      <p>
        Please provide your email address below and we will send you an email
        that will allow you to reset your password.
      </p>
      <ErrorMessage>{serverError}</ErrorMessage>
      <form className="mx-auto w-full" onSubmit={handleSubmit(onSubmit)}>
        <fieldset className="fieldset">
          {
            // Loop through the list of fields and render them out
          }
          {fields.map(({ name, label, placeholder, defaultValue }) => (
            <TextInput
              key={name}
              label={label}
              defaultValue={defaultValue}
              placeholder={placeholder}
              registration={register(name)}
              error={formErrors[name]}
            />
          ))}
        </fieldset>

        <button className="btn btn-primary mt-5" disabled={isSubmitting}>
          Request Password Reset{' '}
          {isSubmitting && (
            <span className="loading loading-spinner loading-xs"></span>
          )}
        </button>
        <Link to={`/login${search}`} className="btn btn-neutral mt-5 ml-2">
          Back to Login
        </Link>
      </form>
    </div>
  );
};

export default ForgottenPassword;
