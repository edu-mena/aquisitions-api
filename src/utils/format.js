export const formatValidationErrors = errors => {
  if (!errors || !errors.issues) return 'Validation Failed';

  if (Array.isArray(errors.issues))
    return errors.issues.map(i => i.message).jpin(', ');

  return JSON.stringify(errors);
};
