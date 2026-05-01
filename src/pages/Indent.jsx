import React, { useEffect, useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const Indent = () => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    post: '',
    gender: '',
    prefer: '',
    numberOfPost: '',
    competitionDate: '',
    socialSite: '',
    experienceDetails: '',
  });
  const [indentData, setIndentData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const platforms = ['LinkedIn', 'Instagram', 'Facebook', 'WhatsApp'];

  const handlePlatformChange = (platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const API_URL = `${import.meta.env.VITE_API_URL}/indents`;

  useEffect(() => {
    fetchIndentData(1);
  }, [searchTerm]);

  const fetchIndentData = async (page = 1) => {
    try {
      setTableLoading(true);
      const response = await fetch(`${API_URL}?page=${page}&limit=${pagination.limit}&search=${searchTerm}`);
      const result = await response.json();
      
      if (result.success) {
        // Map Prisma properties to camelCase used in the table
        const processedData = result.data.map(indent => ({
          timestamp: indent.createdAt,
          indentNumber: indent.indent_number,
          post: indent.post,
          gender: indent.gender,
          prefer: indent.priority,
          experienceDetails: indent.experience_details,
          noOfPost: indent.number_of_posts,
          completionDate: indent.completion_date,
          socialSite: indent.social_site,
          socialPlatforms: indent.social_platforms,
        }));
        setIndentData(processedData);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: result.data.length,
          totalPages: 1
        });
      } else {
        toast.error(result.error || 'Failed to fetch indents');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Could not connect to the backend server');
    } finally {
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchIndentData(newPage);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.post ||
      !formData.gender ||
      !formData.numberOfPost ||
      !formData.competitionDate ||
      !formData.socialSite
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);

      const requestData = {
        post: formData.post,
        gender: formData.gender,
        priority: formData.prefer || 'Any',
        number_of_posts: parseInt(formData.numberOfPost, 10),
        competition_date: new Date(formData.competitionDate).toISOString(),
        social_site: formData.socialSite,
        social_platforms: formData.socialSite === 'Yes' ? selectedPlatforms.join(', ') : null,
        experience_details: formData.prefer === 'Experience' ? formData.experienceDetails : null,
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Indent submitted successfully!');
        setFormData({
          post: '',
          gender: '',
          prefer: '',
          numberOfPost: '',
          competitionDate: '',
          socialSite: '',
          experienceDetails: '',
        });
        setSelectedPlatforms([]);
        setShowModal(false);
        fetchIndentData(pagination.page);
      } else {
        toast.error('Failed to submit: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Something went wrong! Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      post: '',
      gender: '',
      prefer: '',
      numberOfPost: '',
      competitionDate: '',
      socialSite: '',
      experienceDetails: '',
    });
    setSelectedPlatforms([]);
    setShowModal(false);
  };

  return (
    <>
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-white/20 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Create New Indent</h3>
              <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Post *</label>
                <input
                  type="text"
                  name="post"
                  value={formData.post}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter post title"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Any">Any</option>
                </select>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prefer</label>
                <select
                  name="prefer"
                  value={formData.prefer}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Any</option>
                  <option value="Experience">Experience</option>
                  <option value="Fresher">Fresher</option>
                </select>
              </div>

                  {formData.prefer === 'Experience' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Experience Details *</label>
                      <input
                        type="text"
                        name="experienceDetails"
                        value={formData.experienceDetails}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="eg. 2 Years"
                        required
                      />
                    </div>
                  )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number Of Post *</label>
                <input
                  type="number"
                  name="numberOfPost"
                  value={formData.numberOfPost}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter number of posts"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competition Date *</label>
                <input
                  type="date"
                  name="competitionDate"
                  value={formData.competitionDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div> 
                <label className="block text-sm font-medium text-gray-700 mb-1">Social Site *</label>
                <select 
                  name="socialSite"
                  value={formData.socialSite}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {formData.socialSite === 'Yes' && (
                <div className="space-y-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Select Platforms</p>
                  <div className="grid grid-cols-2 gap-3">
                    {platforms.map(platform => (
                      <label key={platform} className="flex items-center space-x-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform)}
                          onChange={() => handlePlatformChange(platform)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">
                          {platform}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all duration-200 shadow-lg shadow-indigo-200 flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Create Indent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6 page-content p-6">
        <div className="flex items-center justify-end">
          <button 
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200"
          >
            <Plus size={16} className="mr-2" />
            Create Indent
          </button>
        </div>


        {/* Search Filter Container */}
        <div className="bg-white rounded-xl shadow-md border p-6 mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by indent number, post, or priority..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all duration-200"
            />
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 shadow">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prefer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Social Site</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        Loading data...
                      </td>
                    </tr>
                  ) : indentData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No indent data found.
                      </td>
                    </tr>
                  ) : (
                    indentData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-600">
                          {item.indentNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.post}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.prefer}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.experienceDetails}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.noOfPost}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.completionDate ? new Date(item.completionDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.socialPlatforms || "No"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>

                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pagination.page === pageNum
                              ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Indent;