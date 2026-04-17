import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import ErrorMessage from './ErrorMessage';
import TextInput from './TextInput';
import SuccessMessage from './SuccessMessage';

interface ClientApp {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUri: string;
}

interface ClientAppFormProps {
  clientApps: ClientApp[];
  setClientApps: any;
}

const ClientAppForm = ({ clientApps, setClientApps }: ClientAppFormProps) => {
  // Define the valid inputs for the form
  const clientAppSchema = z.object({
    clientId: z.string().min(1, 'Please provide a client id'),
    clientSecret: z.string().min(1, 'Please provide a client secret'),
    name: z.string().min(1, 'Please provide a name'),
    redirectUri: z.url('Please provide a valid URL'),
  });

  //Infer the layout of our form from the zod schema
  type ClientAppForm = z.infer<typeof clientAppSchema>;
  // Used for the display of more generic errors (identified server side)
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');

  // The logic for handling the submit of the form
  const onSubmit = async (data: ClientAppForm) => {
    setServerError('');
    setServerSuccess('');

    try {
      const response = await axios.post('/api/clientapps', data);
      reset();
      setServerSuccess(
        response?.data?.message ?? 'New client app created successfully.',
      );
      setClientApps([...clientApps, response.data.clientApp]);
    } catch (error: unknown) {
      // Catch any errors
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
      name: 'name' as const,
      label: 'Application Name',
      placeholder: 'Name',
    },
    {
      name: 'clientId' as const,
      label: 'Client ID',
      placeholder: 'Client ID',
    },
    {
      name: 'clientSecret' as const,
      label: 'Client Secret',
      placeholder: 'Secret',
    },
    {
      name: 'redirectUri' as const,
      label: 'Redirect URI',
      placeholder: 'https://example.com/callback',
    },
  ];

  // Take the required functions from react-hook-forms and register our zod resolver for client side validation
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<ClientAppForm>({
    resolver: zodResolver(clientAppSchema),
    mode: 'onBlur',
  });

  return (
    <div className="flex flex-col">
      <SuccessMessage>{serverSuccess}</SuccessMessage>
      <ErrorMessage>{serverError}</ErrorMessage>

      <form className="mx-auto w-full" onSubmit={handleSubmit(onSubmit)}>
        <fieldset className="fieldset">
          {fields.map(({ name, label, placeholder }) => (
            <TextInput
              key={name}
              label={label}
              placeholder={placeholder}
              registration={register(name)}
              error={formErrors[name]}
            />
          ))}
        </fieldset>

        <button className="btn btn-primary mt-5" disabled={isSubmitting}>
          Submit{' '}
          {isSubmitting && (
            <span className="loading loading-spinner loading-xs"></span>
          )}
        </button>
      </form>
    </div>
  );
};

export default ClientAppForm;
