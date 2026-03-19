import React, { useEffect, useMemo, useState } from "react";
import { X, Upload, Users, MapPin, Calendar, DollarSign } from "lucide-react";
import { useForm, FieldPathValue } from "react-hook-form";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (groupData: GroupFormData) => void;
  mode?: "create" | "edit";
  initialValues?: Partial<GroupFormData>;
}

export interface GroupFormData {
  name: string;
  description: string;
  category: string;
  location: string;
  image: string;
  isOpen: boolean;
  maxMembers: number;
  monthlyContribution: number;
  meetingFrequency: string;
  meetingDay: string;
  rules: string;
}

const categories = [
  "Professionals",
  "Entrepreneurs",
  "Women",
  "Youth",
  "Community",
  "Religious",
  "Trade",
];

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode = "create",
  initialValues,
}) => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = mode === "edit";

  const defaultValues: GroupFormData = {
    name: "",
    description: "",
    category: "",
    location: "",
    image: "",
    isOpen: true,
    maxMembers: 50,
    monthlyContribution: 10000,
    meetingFrequency: "monthly",
    meetingDay: "Saturday",
    rules: "",
  };

  const mergedDefaults = useMemo(() => {
    const merged = { ...defaultValues, ...(initialValues ?? {}) };
    return {
      ...merged,
      isOpen:
        typeof merged.isOpen === "boolean" ? merged.isOpen : defaultValues.isOpen,
      maxMembers: Number(merged.maxMembers ?? defaultValues.maxMembers),
      monthlyContribution: Number(
        merged.monthlyContribution ?? defaultValues.monthlyContribution,
      ),
      meetingFrequency:
        merged.meetingFrequency || defaultValues.meetingFrequency,
      meetingDay: merged.meetingDay || defaultValues.meetingDay,
    } as GroupFormData;
  }, [initialValues]);

  const { watch, setValue, getValues, reset } = useForm<GroupFormData>({
    defaultValues: mergedDefaults,
  });

  const formData = watch();

  useEffect(() => {
    if (isOpen) {
      reset(mergedDefaults);
      setStep(1);
      setErrors({});
    }
  }, [isOpen, mergedDefaults, reset]);

  if (!isOpen) return null;

  const validateStep1 = () => {
    const v = getValues();
    const newErrors: Record<string, string> = {};
    if (!v.name.trim()) newErrors.name = "Group name is required";
    if (!v.description.trim())
      newErrors.description = "Description is required";
    if (!v.category) newErrors.category = "Please select a category";
    if (!v.location.trim()) newErrors.location = "Location is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (formData.maxMembers < 5)
      newErrors.maxMembers = "Minimum 5 members required";
    if (formData.monthlyContribution < 1000)
      newErrors.monthlyContribution = "Minimum ₦1,000 contribution";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    onSubmit(getValues());
    reset(defaultValues);
    setStep(1);
  };

  const updateField = <K extends keyof GroupFormData>(
    field: K,
    value: GroupFormData[K],
  ) => {
    setValue(field, value as FieldPathValue<GroupFormData, K>, {
      shouldDirty: true,
    });
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field as string]: "" }));
    }
  };

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="top-0 sticky flex justify-between items-center bg-white px-6 py-4 border-gray-100 border-b">
          <div>
            <h2 className="font-bold text-gray-900 text-xl">
              {isEdit ? "Edit Group" : "Create New Group"}
            </h2>
            <p className="text-gray-500 text-sm">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  s <= step ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g., Lagos Tech Professionals Circle"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                    errors.name ? "border-red-300" : "border-gray-200"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-red-500 text-sm">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe your group's purpose, goals, and who should join..."
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none ${
                    errors.description ? "border-red-300" : "border-gray-200"
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-red-500 text-sm">
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none bg-white ${
                    errors.category ? "border-red-300" : "border-gray-200"
                  }`}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-red-500 text-sm">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Location *
                </label>
                <div className="relative">
                  <MapPin className="top-1/2 left-4 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="e.g., Lagos, Nigeria"
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                      errors.location ? "border-red-300" : "border-gray-200"
                    }`}
                  />
                </div>
                {errors.location && (
                  <p className="mt-1 text-red-500 text-sm">{errors.location}</p>
                )}
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Group Image URL
                </label>
                <div className="relative">
                  <Upload className="top-1/2 left-4 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => updateField("image", e.target.value)}
                    placeholder="Optional: Image URL for the group banner"
                    className="py-3 pr-4 pl-12 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                  />
                </div>
                <p className="mt-1 text-gray-500 text-sm">
                  Provide an image URL to personalize the group header.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Maximum Members
                </label>
                <div className="relative">
                  <Users className="top-1/2 left-4 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                  <input
                    type="number"
                    value={formData.maxMembers}
                    onChange={(e) =>
                      updateField("maxMembers", parseInt(e.target.value) || 0)
                    }
                    min={5}
                    max={500}
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                      errors.maxMembers ? "border-red-300" : "border-gray-200"
                    }`}
                  />
                </div>
                {errors.maxMembers && (
                  <p className="mt-1 text-red-500 text-sm">
                    {errors.maxMembers}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Monthly Contribution (₦)
                </label>
                <div className="relative">
                  <DollarSign className="top-1/2 left-4 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                  <input
                    type="number"
                    value={formData.monthlyContribution}
                    onChange={(e) =>
                      updateField(
                        "monthlyContribution",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    min={1000}
                    step={1000}
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                      errors.monthlyContribution
                        ? "border-red-300"
                        : "border-gray-200"
                    }`}
                  />
                </div>
                <p className="mt-1 text-gray-500 text-sm">
                  Suggested: ₦10,000 - ₦50,000 per month
                </p>
                {errors.monthlyContribution && (
                  <p className="mt-1 text-red-500 text-sm">
                    {errors.monthlyContribution}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="block mb-2 font-medium text-gray-700 text-sm">
                    Open for new members
                  </p>
                  <p className="text-gray-500 text-sm">
                    Allow others to join this group.
                  </p>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isOpen}
                    onChange={(e) => updateField("isOpen", e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`w-11 h-6 rounded-full transition-colors ${
                      formData.isOpen ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        formData.isOpen ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </span>
                </label>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Meeting Frequency
                </label>
                <select
                  value={formData.meetingFrequency}
                  onChange={(e) =>
                    updateField("meetingFrequency", e.target.value)
                  }
                  className="bg-white px-4 py-3 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 w-full appearance-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Preferred Meeting Day
                </label>
                <select
                  value={formData.meetingDay}
                  onChange={(e) => updateField("meetingDay", e.target.value)}
                  className="bg-white px-4 py-3 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 w-full appearance-none"
                >
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Rules & Review */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Group Rules & Guidelines
                </label>
                <textarea
                  value={formData.rules}
                  onChange={(e) => updateField("rules", e.target.value)}
                  placeholder="Enter any specific rules or guidelines for your group members..."
                  rows={4}
                  className="px-4 py-3 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 w-full resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-5 rounded-xl">
                <h3 className="mb-4 font-semibold text-gray-900">
                  Group Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name</span>
                    <span className="font-medium text-gray-900">
                      {formData.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category</span>
                    <span className="font-medium text-gray-900">
                      {formData.category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location</span>
                    <span className="font-medium text-gray-900">
                      {formData.location}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Members</span>
                    <span className="font-medium text-gray-900">
                      {formData.maxMembers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Contribution</span>
                    <span className="font-medium text-emerald-600">
                      ₦{formData.monthlyContribution.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Meetings</span>
                    <span className="font-medium text-gray-900">
                      {formData.meetingFrequency} on {formData.meetingDay}s
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl">
                <p className="text-emerald-700 text-sm">
                  {isEdit
                    ? "You're updating group details. Changes will reflect immediately for members."
                    : "By creating this group, you agree to our community guidelines and will be assigned as the group administrator."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bottom-0 sticky flex gap-3 bg-white px-6 py-4 border-gray-100 border-t">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-medium text-gray-700 transition-colors"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-medium text-white transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-medium text-white transition-colors"
            >
              {isEdit ? "Save Changes" : "Create Group"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
