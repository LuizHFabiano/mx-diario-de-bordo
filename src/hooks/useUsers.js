import { useEffect, useState } from 'react';
import { repo } from '../data/localRepository';

export function useUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    repo.getUsers().then(setUsers);
  }, []);

  return users;
}
