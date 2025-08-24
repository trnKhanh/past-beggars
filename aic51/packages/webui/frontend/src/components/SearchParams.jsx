import { Form, useSubmit, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Dropdown, Editable, MultiSelect } from "./Filter.jsx";
import {
  limitOptions,
  nprobeOption,
  temporal_k_default,
  ocr_weight_default,
  ocr_threshold_default,
  max_interval_default,
} from "../resources/options.js";
import { getTargetFeatures } from "../services/search.js";

export default function SearchParams({ modelOptions }) {
  const submit = useSubmit();
  const location = useLocation();
  const [targetFeatures, setTargetFeatures] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  // Fetch target features on component mount
  useEffect(() => {
    const fetchTargetFeatures = async () => {
      try {
        const features = await getTargetFeatures();
        setTargetFeatures(Array.isArray(features) ? features : []);
      } catch (error) {
        console.error('Failed to fetch target features:', error);
        setTargetFeatures([]);
      }
    };
    fetchTargetFeatures();
  }, []);

  // Update form values based on URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const params = {
      nprobe: searchParams.get('nprobe') || nprobeOption[0],
      limit: searchParams.get('limit') || limitOptions[0],
      model: searchParams.get('model') || '',
      temporal_k: searchParams.get('temporal_k') || temporal_k_default,
      ocr_weight: searchParams.get('ocr_weight') || ocr_weight_default,
      ocr_threshold: searchParams.get('ocr_threshold') || ocr_threshold_default,
      max_interval: searchParams.get('max_interval') || max_interval_default,
    };

    for (const [k, v] of Object.entries(params)) {
      const element = document.querySelector(`#${k}`);
      if (element) {
        element.value = v;
      }
    }

    // Handle target_features from URL parameters
    const targetFeaturesParam = searchParams.get('target_features');
    if (targetFeaturesParam) {
      try {
        const features = JSON.parse(targetFeaturesParam);
        setSelectedFeatures(Array.isArray(features) ? features : []);
      } catch {
        setSelectedFeatures([]);
      }
    } else {
      setSelectedFeatures([]);
    }
  }, [location.search]);

  const handleOnChangeParams = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {};
    const targetFeaturesSelected = [];
    
    for (const [k, v] of formData.entries()) {
      if (k === 'target_features') {
        targetFeaturesSelected.push(v);
      } else {
        data[k] = v;
      }
    }

    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q') ? { q: searchParams.get('q') } : {};
    const selected = searchParams.get('selected');
    
    const submitData = { ...query, ...data };
    if (targetFeaturesSelected.length > 0) {
      submitData.target_features = JSON.stringify(targetFeaturesSelected);
    }
    if (selected) {
      submitData.selected = selected;
    }

    const action = location.pathname.includes('/similar') ? '/similar' : '/search';
    submit(submitData, { action });
  };

  return (
    <div className="w-96 p-4 bg-gray-50 border-r border-gray-200">
      <Form className="flex flex-col space-y-3" onSubmit={handleOnChangeParams}>
        <div className="grid grid-cols-2 gap-1">
          <Dropdown name="nprobe" options={nprobeOption} />
          <Dropdown name="limit" options={limitOptions} />
          <div className="col-span-2">
            <Dropdown name="model" options={modelOptions || []} />
          </div>
          <Editable name="temporal_k" defaultValue={temporal_k_default} />
          <Editable name="ocr_weight" defaultValue={ocr_weight_default} />
          <Editable name="ocr_threshold" defaultValue={ocr_threshold_default} />
          <Editable name="max_interval" defaultValue={max_interval_default} />
        </div>

        {targetFeatures.length > 0 && (
          <div className="col-span-2">
            <MultiSelect
              name="target_features"
              options={targetFeatures}
              selectedValues={selectedFeatures}
            />
          </div>
        )}

        <input
          className="w-full text-sm px-2 py-1 border-2 border-gray-500 rounded-lg bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 cursor-pointer"
          type="submit"
          value="Apply"
        />
      </Form>
    </div>
  );
}