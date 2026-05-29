import { useEffect, useState } from "react";
import axios from "axios";

type User = {
  id: number;
  email: string;
  name: string;
};

//let's build the frontend as our backend works fine.
const App = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    axios
      .get("http://localhost:3000/users")
      .then((res) => {
        setUsers(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <div>
      <h1>Northstar Users</h1>

      {users.map((user) => (
        <div key={user.id}>
          <p>{user.name}</p>
          <p>{user.email}</p>
        </div>
      ))}
    </div>
  );
};

export default App;
//Let's run it both now
// This is also now working in the broswer.
// we can now actually see it in the browser working fine.
