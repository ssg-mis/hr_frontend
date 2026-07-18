import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Edit3,
  Save,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const MyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchJoiningData = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        throw new Error("No user data found in localStorage");
      }

      const currentUser = JSON.parse(userData);
      const userEmpCode =
        currentUser.employeeCode || currentUser.username || '';
      if (!userEmpCode) {
        throw new Error("Employee code is missing from localStorage");
      }

      const result = await api.get(`/joining/profile?employeeCode=${encodeURIComponent(userEmpCode)}`);
      const profile = result.data;
      if (!profile) {
        throw new Error("No profile data found for current user");
      }

      setProfileData(profile);
      setFormData(profile);
    } catch (error) {
      console.error("Error fetching profile data:", error);
      toast.error(`Failed to load profile data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJoiningData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!profileData?.id) {
        throw new Error("Profile ID is missing");
      }

      const result = await api.patch(`/joining/profile/${profileData.id}`, {
        mobileNo: formData.mobileNo,
        familyMobileNo: formData.familyMobileNo,
        email: formData.email,
        currentAddress: formData.currentAddress,
      });

      setProfileData(result.data);
      setFormData(result.data);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(profileData || {});
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="page-content p-6">
        <div className="flex justify-center flex-col items-center">
          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
          <span className="text-gray-600 text-sm">
            Loading pending calls...
          </span>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return <div className="page-content p-6">No profile data available</div>;
  }

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-end">
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Edit3 size={16} className="mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save size={16} className="mr-2" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture & Basic Info */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="text-center">
            <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <img className="h-10 w-10" src={profileData.candidatePhoto} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {profileData.candidateName}
            </h2>
            <p className="text-gray-600">{profileData.designation}</p>
            <p className="text-sm text-gray-500">{profileData.joiningNo}</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail size={16} className="inline mr-2" />
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="text-gray-800">{profileData.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone size={16} className="inline mr-2" />
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="mobileNo"
                  value={formData.mobileNo || ""}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="text-gray-800">{profileData.mobileNo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building size={16} className="inline mr-2" />
                Company
              </label>
              <p className="text-gray-800">{profileData.companyName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-2" />
                Joining Date
              </label>
              <p className="text-gray-800">{profileData.dateOfJoining}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Father's Name
              </label>
              <p className="text-gray-800">{profileData.fatherName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <p className="text-gray-800">{profileData.gender}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <p className="text-gray-800">{profileData.bodAsPerAadhar}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="familyMobileNo"
                  value={formData.familyMobileNo || ""}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="text-gray-800">{profileData.familyMobileNo}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin size={16} className="inline mr-2" />
                Current Address
              </label>
              {isEditing ? (
                <textarea
                  name="currentAddress"
                  value={formData.currentAddress || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="text-gray-800 whitespace-pre-line">
                  {profileData.currentAddress}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin size={16} className="inline mr-2" />
                Aadhar Address
              </label>
              <p className="text-gray-800 whitespace-pre-line">
                {profileData.addressAsPerAadhar}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
