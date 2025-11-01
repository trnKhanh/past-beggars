import { Form } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../AuthProvider.jsx";

export default function AuthForm({}) {
  const { updateAuth } = useContext(AuthContext);
  return (
    <div className="mb-2">
      <Form
        className="p-1 flex flex-row space-x-1 bg-blue-200"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          updateAuth(formData.get("username"), formData.get("password"));
        }}
      >
        <input
          className="min-w-0 p-1"
          type="text"
          name="username"
          placeholder="username"
        />
        <input
          className="min-w-0 p-1"
          type="password"
          name="password"
          placeholder="password"
        />
        <input
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-xl "
          type="submit"
          value="Sign in"
        />
      </Form>
    </div>
  );
}