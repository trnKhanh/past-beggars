export function Dropdown({ name, options }) {
  return (
    <div className="flex items-center bg-white border-2 rounded-lg p-1 gap-2">
      <label className="font-bold text-xs whitespace-nowrap" htmlFor={name}>
        {name}
      </label>
      <select id={name} name={name} className="focus:outline-none text-sm flex-1">
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Editable({ name, defaultValue }) {
  return (
    <div className="flex items-center bg-white border-2 rounded-lg p-1 gap-2">
      <label className="font-bold text-xs whitespace-nowrap" htmlFor={name}>
        {name}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="focus:outline-none text-sm w-16"
      />
    </div>
  );
}

export function MultiSelect({ name, options = [], selectedValues = [] }) {
  const safeOptions = Array.isArray(options) ? options : [];
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];
  
  return (
    <div className="flex flex-col bg-white border-2 rounded-lg p-1 gap-2">
      <label className="font-bold text-xs whitespace-nowrap">
        {name}
      </label>
      <div className="max-h-32 overflow-y-auto grid grid-cols-2 gap-1">
        {safeOptions.map((item) => (
          <label key={item} className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              name={name}
              value={item}
              defaultChecked={safeSelectedValues.includes(item)}
              className="text-xs"
            />
            <span className="text-xs">{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
