import { useState, useEffect, useRef, useMemo } from "react";
import classNames from "classnames";
import AddButton from "../assets/add-btn.svg";
import DeleteButton from "../assets/delete-btn.svg";

export function AdvanceQueryContainer({
  q,
  onChange,
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
  onSubmit
}) {
  const parseQuery = (queryString) => {
    let q = queryString;
    const ocrs = [];
    const speeches = [];
    
    let ocrRegex = /\[OCR:((".*?")|\S+)\]\s?/gi;
    const ocrMatches = q.matchAll(ocrRegex);
    for (const match of ocrMatches) {
      let content = match[1];
      if (content.startsWith('"') && content.endsWith('"')) {
        content = content.slice(1, -1);
      }
      ocrs.push(content.trim());
      q = q.replace(match[0], "");
    }
    
    let speechRegex = /\[SPEECH:((".*?")|\S+)\]\s?/gi;
    const speechMatches = q.matchAll(speechRegex);
    for (const match of speechMatches) {
      let content = match[1];
      if (content.startsWith('"') && content.endsWith('"')) {
        content = content.slice(1, -1);
      }
      speeches.push(content.trim());
      q = q.replace(match[0], "");
    }
    
    return { text: q.trim(), ocrs, speeches };
  };
  
  const buildQuery = (text, ocrs, speeches) => {
    let selectorStr = [];
    for (const ocr of ocrs) {
      selectorStr.push(`[OCR:"${ocr}"]`);
    }
    for (const speech of speeches) {
      selectorStr.push(`[SPEECH:"${speech}"]`);
    }
    return text + (selectorStr.length > 0 ? " " + selectorStr.join(" ") : "");
  };

  const { text: q, ocrs, speeches } = useMemo(() => parseQuery(temporalQuery), [temporalQuery]);

  const handleOnChange = (e) => {
    const newText = e.target.value;
    onChange(buildQuery(newText, ocrs, speeches));
  };
  
  const handleOnOCRChange = (e) => {
    const newOcrs = e.target.value.length > 0 ? 
      e.target.value.split(",").map(ocr => ocr.trim()).filter(ocr => ocr) : [];
    onChange(buildQuery(q, newOcrs, speeches));
  };
  
  const handleOnSpeechChange = (e) => {
    const newSpeeches = e.target.value.length > 0 ? 
      e.target.value.split(",").map(speech => speech.trim()).filter(speech => speech) : [];
    onChange(buildQuery(q, ocrs, newSpeeches));
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
       alt={"Delete Button"}/>
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
        placeholder="OCR text"
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
      <textarea
        className="text-sm bg-slate-100 text-slate-400 focus:bg-white focus:text-black focus:outline-none"
        rows={1}
        placeholder="Speech/Audio text"
        value={speeches.join(",")}
        onKeyDown={(e) => {
          if (e.keyCode === 13 && e.shiftKey === false) {
            e.preventDefault();
            onSubmit();
          }
          if (e.keyCode === 222 || e.keyCode === 13) {
            e.preventDefault();
          }
        }}
        onChange={handleOnSpeechChange}
      />
    </div>
  );
}

export function SearchableDropdown({ name, options, onSelect }) {
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
