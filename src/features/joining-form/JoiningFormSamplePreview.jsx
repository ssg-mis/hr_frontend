import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import JoiningFormPrintModal from './JoiningFormPrintModal';
import offerLetterApi from '../offer-letter/offerLetter.api';
import { resolveDefaultSettings } from '../offer-letter/offerLetter.utils';

// Sample employee used by "Preview Format" (nothing is saved).
const SAMPLE_VALUES = {
  employeeCode: '0042', joiningDate: new Date().toISOString().slice(0, 10),
  branchId: 'sample', departmentId: 1, designationId: 1, shiftId: 1, weeklyOffDay: 'SUN', payMode: 'BANK',
  title: 'Mr.', candidateName: 'Rahul Sharma', fatherName: 'Suresh Sharma', dob: '1998-04-12', gender: 'Male',
  maritalStatus: 'Single', bloodGroup: 'B+', qualification: 'ITI Fitter', candidatePhoto: '',
  candidatePhone: '9876543210', alternateMobile: '9123456780', candidateEmail: 'rahul.sharma@example.com',
  presentAddress: 'Ward No. 5, Main Road, Raipur, Chhattisgarh', permanentAddress: 'Village Banari, Naila, Janjgir-Champa, Chhattisgarh',
  aadharNo: '123412341234', panNo: 'ABCDE1234F', voterIdNo: '', drivingLicenseNo: '', rashanCardNo: '',
  bankName: 'State Bank of India', bankAccountNo: '00000000000', ifscCode: 'SBIN0000000',
  pfApplicable: true, uanNumber: '100000000000', pfNumber: '', esicApplicable: true, esicNumber: '0000000000',
  emergencyName: 'Suresh Sharma', emergencyRelation: 'Father', emergencyPhone: '9000000000',
  nominees: [{ name: 'Sunita Sharma', relation: 'Mother', dob: '1972-08-20', share: 100 }],
};

const SAMPLE_INFO = {
  applicationNumber: 'APP-SAMPLE',
  salary: { base: 12000, allowance: 3000, gross: 15000 },
  previous: { company: 'ABC Industries', position: 'Helper', experience: '2 years', lastSalary: '11000', reasonForLeaving: 'Better opportunity' },
};

/** Opens the joining form PDF layout with sample data and the company details from Master Data. */
const JoiningFormSamplePreview = ({ onClose }) => {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await offerLetterApi.getSettings();
        const branch = res.branches?.[0] || { name: '', address: '' };
        setCtx({
          letterhead: resolveDefaultSettings(res),
          options: {
            branches: [{ id: 'sample', name: branch.name, address: branch.address }],
            departments: [{ id: 1, name: 'Production' }],
            designations: [{ id: 1, name: 'Machine Operator' }],
            shifts: [{ id: 1, name: 'General', startTime: '08:45', endTime: '17:35' }],
          },
        });
      } catch (err) {
        toast.error(err.message || 'Failed to load company details');
        onClose();
      }
    })();
  }, [onClose]);

  if (!ctx) return null;
  return (
    <JoiningFormPrintModal
      sample
      applicationId={0}
      values={SAMPLE_VALUES}
      info={SAMPLE_INFO}
      options={ctx.options}
      letterhead={ctx.letterhead}
      onClose={onClose}
    />
  );
};

export default JoiningFormSamplePreview;
