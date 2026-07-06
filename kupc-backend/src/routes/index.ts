import { Router } from 'express';
import { config } from '../config/config';
import { successResponse } from '../utils/apiResponse';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json(
    successResponse(
      {
        name: config.api.name,
        version: config.api.version
      },
      'KUPC API base route'
    )
  );
});

export default router;
