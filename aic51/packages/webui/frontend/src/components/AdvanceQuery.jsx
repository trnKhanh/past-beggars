import { useState, useEffect, useRef } from "react";
import classNames from "classnames";
import AddButton from "../assets/add-btn.svg";
import DeleteButton from "../assets/delete-btn.svg";
import XButton from "../assets/x-btn.svg";

export function AdvanceQueryContainer({
  q,
  onChange,
  objectOptions,
  onSubmit,
}) {
  const temporalQueries = q.split(";");
  const handleOnChange = (id, newTemporalQuery) => {
    temporalQueries[id] = newTemporalQuery;
    onChange(temporalQueries.join(";"));
  };
  const handleOnDelete = (id) => {
    temporalQueries.splice(id, 1);
    onChange(temporalQueries.join(";"));
  };
  return (
    <div className="flex flex-row items-center flex-wrap">
      {temporalQueries.map((tq, id) => (
        <div key={id} className="basis-1/4 p-1">
          <TemporalQueryContainer
            onSubmit={onSubmit}
            objectOptions={objectOptions}
            temporalQuery={tq}
            onChange={(newTemporalQuery) => {
              handleOnChange(id, newTemporalQuery);
            }}
            onDelete={() => {
              handleOnDelete(id);
            }}
          />
        </div>
      ))}
      <div className="basis-1/4">
        <img
          className="hover:bg-gray-300 active:bg-gray-400 m-auto"
          src={AddButton}
          width="30em"
          draggable={false}
          onClick={() => {
            onChange(q + ";");
          }}
        />
      </div>
    </div>
  );
}

export function TemporalQueryContainer({
  temporalQuery,
  onChange,
  onDelete,
  objectOptions,
  onSubmit,
}) {
  let q = temporalQuery;
  let ocrRegex = /OCR:((".*?")|\S+)\s?/gi;
  const ocrMatches = q.matchAll(ocrRegex);
  const ocrs = [];
  for (const match of ocrMatches) {
    ocrs.push(
      match[0]
        .substring(4)
        .trim()
        .replace(/(^"|"$)/g, ""),
    );
    q = q.replace(match[0], "");
  }
  let objectbbRegex = /object:((".*?")|\S+)\s?/gi;
  const objectbbMatches = q.matchAll(objectbbRegex);
  const objectbbs = [];
  for (const match of objectbbMatches) {
    const objectbbStr = match[0]
      .substring(7)
      .trim()
      .replace(/(^"|"$)/g, "");
    const objectbbStrPart = objectbbStr.split("_");
    let bbox = [];
    if (objectbbStrPart.length > 1) {
      bbox = objectbbStrPart[1].split(",");
      for (let i = 0; i < bbox.length; ++i) bbox[i] = parseFloat(bbox[i]);
    }
    while (bbox.length > 4) {
      bbox.pop();
    }
    while (bbox.length < 4) {
      if (bbox.length < 2) bbox.push(0);
      else bbox.push(1);
    }
    objectbbs.push([bbox, objectbbStrPart[0]]);
    q = q.replace(match[0], "");
  }

  const handleOnChange = (e) => {
    const newQ = e.target.value;
    let selectorStr = [];
    for (const ocr of ocrs) {
      selectorStr.push(`OCR:"${ocr}"`);
    }
    for (const objectbb of objectbbs) {
      selectorStr.push(`object:"${objectbb[1]}_${objectbb[0].join(",")}"`);
    }
    onChange(newQ + selectorStr.join(" "));
  };
  const handleOnOCRChange = (e) => {
    let selectorStr = [];
    if (e.target.value.length > 0) {
      let newocrs = e.target.value.split(",");
      for (const ocr of newocrs) {
        selectorStr.push(`OCR:"${ocr}"`);
      }
    }
    for (const objectbb of objectbbs) {
      selectorStr.push(`object:"${objectbb[1]}_${objectbb[0].join(",")}"`);
    }

    onChange(q + selectorStr.join(" "));
  };
  const handleOnObjectbbChange = (newObjectbbs) => {
    let selectorStr = [];
    for (const ocr of ocrs) {
      selectorStr.push(`OCR:"${ocr}"`);
    }
    for (const objectbb of newObjectbbs) {
      selectorStr.push(`object:"${objectbb[1]}_${objectbb[0].join(",")}"`);
    }

    onChange(q + selectorStr.join(" "));
  };
  return (
    <div className="text-sm bg-sky-300 flex flex-col p-1 space-y-1">
      <img
        className="mx-auto hover:bg-gray-300 active:bg-gray-400"
        src={DeleteButton}
        width="25em"
        draggable={false}
        onClick={() => {
          onDelete();
        }}
      />
      <textarea
        className="text-sm bg-slate-100 text-slate-400 focus:bg-white focus:text-black focus:outline-none"
        rows={2}
        value={q}
        onChange={handleOnChange}
        onKeyDown={(e) => {
          if (e.keyCode === 13 && e.shiftKey === false) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <textarea
        className="text-sm bg-slate-100 text-slate-400 focus:bg-white focus:text-black focus:outline-none"
        rows={1}
        value={ocrs.join(",")}
        onKeyDown={(e) => {
          if (e.keyCode === 13 && e.shiftKey === false) {
            e.preventDefault();
            onSubmit();
          }
          if (e.keyCode === 222 || e.keyCode === 13) {
            e.preventDefault();
          }
        }}
        onChange={handleOnOCRChange}
      />
      <ObjectContainer
        objectbbs={objectbbs}
        objectOptions={objectOptions}
        onChange={handleOnObjectbbChange}
      />
    </div>
  );
}

export function ObjectContainer({ objectOptions, objectbbs, onChange }) {
  const [position, setPosition] = useState("");
  const handleOnDelete = (id) => {
    objectbbs.splice(id, 1);
    onChange(objectbbs);
  };
  const handleOnCreate = (o) => {
    if (objectOptions.includes(o)) {
      if (position === "L") {
        objectbbs.push([[0, 0, 0.5, 1], o]);
      } else if (position === "M") {
        objectbbs.push([[0.25, 0, 0.75, 1], o]);
      } else if (position === "R") {
        objectbbs.push([[0.5, 0, 1, 1], o]);
      } else {
        objectbbs.push([[0, 0, 1, 1], o]);
      }
    }
    onChange(objectbbs);
  };
  return (
    <div className="flex flex-col space-y-1">
      <div className="flex flex-row ">
        <select
          className="bg-red-200"
          value={position}
          onChange={(e) => {
            setPosition(e.target.value);
          }}
        >
          <option value=""></option>
          <option value="L">L</option>
          <option value="M">M</option>
          <option value="R">R</option>
        </select>
        <div className="flex-1">
          <SearchabeDropdown
            name={"objectbb-selection"}
            options={objectOptions}
            onSelect={(opt) => handleOnCreate(opt)}
          />
        </div>
      </div>
      <div className="flex flex-row flex-wrap">
        {objectbbs.map((o, id) => (
          <div key={id} className="px-1">
            <ObjectBox
              objectbb={
                o[1] +
                (o[0][2] - o[0][0] < 1
                  ? o[0][0] < 0.25
                    ? "(L)"
                    : o[0][0] > 0.25
                      ? "(R)"
                      : "(M)"
                  : "")
              }
              onDelete={() => handleOnDelete(id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ObjectBox({ objectbb, onDelete }) {
  return (
    <div className="flex flex-row items-center space-x-1 bg-orange-100 w-fit">
      <div>{objectbb}</div>
      <img
        className="bg-red-100"
        src={XButton}
        width="15rem"
        onClick={onDelete}
      />
    </div>
  );
}

export function SearchabeDropdown({ name, options, onSelect }) {
  const [isFocus, setIsFocus] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownElement = useRef(null);
  const visibleOptions = [];
  for (const opt of options) {
    let l = 0;
    const lowerOpt = opt.toLowerCase();
    const lowerSearch = search.toLowerCase();
    for (let r = 0; r < opt.length; ++r) {
      if (lowerOpt[r] === lowerSearch[l]) ++l;
    }
    let score = 1;
    if (search.length > 0) score = l / search.length;
    if (score > 0) {
      visibleOptions.push({ value: opt, score: score });
    }
  }
  visibleOptions.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.value.length !== b.value.length)
      return a.value.length - b.value.length;
    const v1 = a.value.toLowerCase();
    const v2 = b.value.toLowerCase();
    if (v1 < v2) return -1;
    if (v1 > v2) return 1;
    return 0;
  });

  const handleOnChange = (e) => {
    const text = e.target.value;
    setSearch(text);
  };

  useEffect(() => {
    const handleOnClick = (e) => {
      if (dropdownElement.current.contains(e.target)) {
        setIsFocus(true);
      } else {
        setIsFocus(false);
      }
    };
    document.addEventListener("click", handleOnClick);

    return () => {
      document.removeEventListener("click", handleOnClick);
    };
  }, []);

  return (
    <div className="relative group h-5">
      <div
        id={"searchable-dropdown-" + name}
        className={classNames("absolute flex flex-col w-full", {
          "z-10": isFocus,
        })}
        ref={dropdownElement}
      >
        <input
          className="bg-slate-100 text-slate-400 focus:bg-white focus:text-black focus:outline-none"
          type="text"
          value={search}
          onChange={handleOnChange}
          onKeyDown={(e) => {
            if (e.keyCode === 13) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        />
        <div
          className={classNames(
            "top-full bg-gray-100 p-1 w-full max-h-52 overflow-scroll",
            {
              visible: isFocus,
              hidden: !isFocus,
            },
          )}
        >
          {visibleOptions.map((opt) => (
            <div
              key={opt.value}
              className="hover:bg-blue-200"
              onClick={(e) => {
                e.stopPropagation();
                setSearch("");
                setIsFocus(false);
                onSelect(opt.value);
              }}
            >
              {opt.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
