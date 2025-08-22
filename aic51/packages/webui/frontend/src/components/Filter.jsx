export function Dropdown({ name, options }) {
  return (
    <div className="flex flex-row items-center bg-white border-2 rounded-xl p-1">
      <div className="p-1">
        <label className="font-bold" htmlFor={name}>
          {name + " "}
        </label>
      </div>
      <div className="border rounded-md border-gray-300 p-1 px-2">
        <select id={name} name={name} className="focus:outline-none">
          {options.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
export function Editable({ name, defaultValue }) {
  return (
    <div className="flex flex-row items-center bg-white border-2 rounded-xl p-1">
      <div className="p-1">
        <label className="font-bold" htmlFor={name}>
          {name + " "}
        </label>
      </div>
      <div className="border rounded-md border-gray-300 p-1 px-2">
        <input
          id={name}
          name={name}
          defaultValue={defaultValue}
          size={5}
          className="min-w-0 w-fit focus:outline-none"
        />
      </div>
    </div>
  );
}
