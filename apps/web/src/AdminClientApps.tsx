import axios from 'axios';
import { useEffect, useState } from 'react';
import Loading from './components/Loading';
import ClientAppForm from './components/ClientAppForm';
import SuccessMessage from './components/SuccessMessage';
import ErrorMessage from './components/ErrorMessage';

interface ClientApp {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUri: string;
}

const AdminClientApps = () => {
  // State for storing all of our users
  const [clientApps, setClientApps] = useState<ClientApp[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load our users on page render
  useEffect(() => {
    // The function that will actually load our users (async)
    async function loadClientApps() {
      try {
        // Get the users from the API (at this point we should be an authorised admin)
        const response = await axios.get('/api/clientapps');
        // Set the users
        setClientApps(response.data);
      } catch (error) {
        console.log(error);
      }
      setIsLoading(false);
    }
    // Call the loading of the users
    loadClientApps();
  }, []);

  //This handles clicking the delete button
  async function deleteClientApp(id: string) {
    try {
      // Try and delete the client app through the api
      const response = await axios.delete(`/api/clientapps/${id}`);
      // Set success message
      setSuccessMessage(
        response?.data?.message ?? 'New client app created successfully.',
      );
      // Then remove from the list of client apps
      setClientApps((clientApps) =>
        clientApps!.filter((clientApp) => clientApp.id !== id),
      );
    } catch (error: unknown) {
      // Catch any errors
      // Look for any specific axios errors which have a string message
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.message ?? 'An unexpected error has occurred.',
        );
        return;
      }
      // If we get another type of error then just put out a generic error message
      setErrorMessage('An unexpected error has occurred.');
    }
  }

  // If the page is loading then return the loading spinner
  if (isLoading) return <Loading />;
  // If the page is not loading then render it
  return (
    <>
      <h1>Create Client App</h1>
      <ClientAppForm clientApps={clientApps!} setClientApps={setClientApps} />
      {clientApps && (
        <>
          <h1 className="mt-5">Current Client Apps</h1>
          <SuccessMessage>{successMessage}</SuccessMessage>
          <ErrorMessage>{errorMessage}</ErrorMessage>
          <table className="table mb-5">
            <thead>
              <tr>
                <th>Name</th>
                <th>Client ID</th>
                <th>Redirect URI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientApps.map((clientApp) => {
                return (
                  <tr key={clientApp.id}>
                    <td>{clientApp.name}</td>
                    <td>{clientApp.clientId}</td>
                    <td>{clientApp.redirectUri}</td>
                    <td>
                      <button
                        className="btn btn-error"
                        onClick={() => deleteClientApp(clientApp.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </>
  );
};

export default AdminClientApps;
