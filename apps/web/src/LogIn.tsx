import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import SuccessMessage from './components/SuccessMessage';
import TextInput from './components/TextInput';
import z from 'zod';
import ErrorMessage from './components/ErrorMessage';
import { useState } from 'react';
import axios from 'axios';
import { useMe } from './hooks/useMe';

const LogInPage = () => {
  // Describe the valid format for a login form
  const loginSchema = z.object({
    email: z.email('Please provide a valid email address'),
    password: z.string().min(1, 'Please provide your password'),
  });

  // Infer the layout of our form from the zod schema
  type LoginForm = z.infer<typeof loginSchema>;

  // Used to display any messages from the registration process and getting query params
  const location = useLocation();
  const { search } = location;
  // Get the message from the state
  const message = location.state?.message;
  // Store whether to show it (so we can hide on form submit)
  const [showMessage, setShowMessage] = useState(!!message);

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
  const onSubmit = async (data: LoginForm) => {
    // Reset any error messages
    setServerError('');
    // Don't show any success messages
    setShowMessage(false);

    try {
      const response = await axios.post('/api/login', {
        ...data,
        client_id: searchParams.get('client_id'),
        redirect_uri: searchParams.get('redirect_uri'),
        state: searchParams.get('state'),
      });
      // We have to do the redirection as a browser level action (not through the API)
      window.location.href = response.data.redirectTo;
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
    {
      name: 'password' as const,
      label: 'Password',
      placeholder: 'Password',
      type: 'password',
      defaultValue: '',
    },
  ];

  // Take the required functions from react-hook-forms and register our zod resolver for client side validation
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  if (isLoading) {
    return <></>;
  }

  return (
    <div className="flex flex-col w-full">
      <h1>Log In</h1>
      <p>
        Log in to your existing account below using your email address and
        password.
      </p>
      {showMessage && <SuccessMessage>{message}</SuccessMessage>}
      <ErrorMessage>{serverError}</ErrorMessage>
      <form className="mx-auto w-full" onSubmit={handleSubmit(onSubmit)}>
        <fieldset className="fieldset">
          {
            // Loop through the list of fields and render them out
          }
          {fields.map(({ name, label, placeholder, type, defaultValue }) => (
            <TextInput
              key={name}
              label={label}
              defaultValue={defaultValue}
              placeholder={placeholder}
              type={type}
              registration={register(name)}
              error={formErrors[name]}
            />
          ))}
        </fieldset>

        <button className="btn btn-primary mt-5" disabled={isSubmitting}>
          Log In{' '}
          {isSubmitting && (
            <span className="loading loading-spinner loading-xs"></span>
          )}
        </button>
        <Link to={`/register${search}`} className="btn btn-neutral mt-5 ml-2">
          Not a Member?
        </Link>
      </form>
    </div>
  );
};

export default LogInPage;
