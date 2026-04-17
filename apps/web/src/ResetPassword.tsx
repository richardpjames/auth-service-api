import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useState } from 'react';
import { z } from 'zod';
import ErrorMessage from './components/ErrorMessage';
import TextInput from './components/TextInput';
import { useMe } from './hooks/useMe';

const ResetPassword = () => {
  // Describe the valid format for a registration form (including validating passwords match)
  const resetSchema = z
    .object({
      password: z
        .string()
        .min(8, 'Your password must be at least 8 characters long'),
      passwordConfirm: z.string(),
    })
    // This checks that the two password fields are identical and puts out an error on password confirm
    .refine((data) => data.password === data.passwordConfirm, {
      message: 'Please ensure that your passwords match',
      path: ['passwordConfirm'],
    });

  // Infer the layout of our form from the zod schema
  type ResetForm = z.infer<typeof resetSchema>;
  // Used for the display of more generic errors (identified server side)
  const [serverError, setServerError] = useState('');
  // Used to navigate to the welcome page after registration
  const navigate = useNavigate();
  // Used for getting query params
  const { search } = useLocation();
  const [searchParams] = useSearchParams();
  // Used for determining whether the user is logged in
  const { user, isLoading } = useMe();

  //Navigate away if there is a user
  if (!isLoading && user) {
    navigate(`/profile${search}`);
  }

  // The logic for handling the submit of the form
  const onSubmit = async (data: ResetForm) => {
    setServerError('');

    try {
      await axios.post('/api/resetpassword', {
        ...data,
        resetToken: searchParams.get('resetToken'),
      });
      // Remove the reset token as we no longer need it
      searchParams.delete('resetToken');
      // Go back to the login screen
      navigate(`/login${search}`, {
        state: {
          message: 'Your password has been updated, you can now log in below.',
        },
      });
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
      name: 'password' as const,
      label: 'Password',
      placeholder: 'Password',
      type: 'password',
    },
    {
      name: 'passwordConfirm' as const,
      label: 'Confirm Password',
      placeholder: 'Confirm Password',
      type: 'password',
    },
  ];

  // Take the required functions from react-hook-forms and register our zod resolver for client side validation
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    mode: 'onBlur',
  });

  if (isLoading) {
    return <></>;
  }

  return (
    <div className="flex flex-col">
      <h1>Reset Your Password</h1>
      <p>
        You can now reset your password to something new, and then use that to
        log in again.
      </p>

      <ErrorMessage>{serverError}</ErrorMessage>

      <form className="mx-auto w-full" onSubmit={handleSubmit(onSubmit)}>
        <fieldset className="fieldset">
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

        <button className="btn btn-primary mt-5" disabled={isSubmitting}>
          Reset Your Password{' '}
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

export default ResetPassword;
