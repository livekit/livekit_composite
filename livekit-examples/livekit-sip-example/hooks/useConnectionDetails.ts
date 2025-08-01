import { useCallback, useEffect, useState } from 'react';
import { ConnectionDetails } from '@/app/api/connection-details/route';

export default function useConnectionDetails(phoneNumber?: string) {
  // Generate room connection details, including:
  //   - A random Room name
  //   - A random Participant name
  //   - An Access Token to permit the participant to join the room
  //   - The URL of the LiveKit server to connect to
  //
  // In real-world application, you would likely allow the user to specify their
  // own participant name, and possibly to choose from existing rooms to join.

  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);

  const fetchConnectionDetails = useCallback(() => {
    setConnectionDetails(null);
    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details',
      window.location.origin
    );

    // Add phone number as query parameter if provided
    if (phoneNumber) {
      url.searchParams.append('phoneNumber', phoneNumber);
    }

    fetch(url.toString())
      .then((res) => res.json())
      .then((data) => {
        setConnectionDetails(data);
      })
      .catch((error) => {
        console.error('Error fetching connection details:', error);
        alert(error.message);
      });
  }, [phoneNumber]);

  useEffect(() => {
    if (phoneNumber) {
      fetchConnectionDetails();
    } else {
      // Clear connection details when phone number is cleared
      setConnectionDetails(null);
    }
  }, [fetchConnectionDetails, phoneNumber]);

  return { connectionDetails, refreshConnectionDetails: fetchConnectionDetails };
}
