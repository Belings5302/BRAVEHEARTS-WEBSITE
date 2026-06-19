const Joi = require('joi');

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  googleAuth: Joi.object({
    credential: Joi.string().required(),
  }),

  forgotPassword: Joi.object({

    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  }),

  product: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    sku: Joi.string().min(1).max(50).required(),
    category: Joi.string().required(),
    price_mwk: Joi.number().positive().required(),
    price_usd: Joi.number().positive().required(),
    description: Joi.string().allow(''),
    is_new: Joi.boolean(),
    image_url: Joi.string().allow(''),
  }),

  game: Joi.object({
    tournament: Joi.string().required(),
    opponent: Joi.string().required(),
    opponent_origin: Joi.string().required(),
    team: Joi.string().valid('men', 'women', 'ladies', 'boys', 'girls'),
    our_score: Joi.number().integer().min(0).allow(null),
    opponent_score: Joi.number().integer().min(0).allow(null),
    is_home: Joi.boolean(),
    status: Joi.string().valid('upcoming', 'live', 'result', 'completed', 'cancelled'),
    outcome: Joi.string().valid('win', 'loss', 'draw').allow(null),
    game_date: Joi.date().iso().required(),
    game_time: Joi.string().allow(null),
    venue: Joi.string().allow(null),
    opponent_logo_url: Joi.string().allow('', null),
    notes: Joi.string().allow(null),
  }),

  gameUpdate: Joi.object({
    tournament: Joi.string(),
    opponent: Joi.string(),
    opponent_origin: Joi.string(),
    team: Joi.string().valid('men', 'women', 'ladies', 'boys', 'girls'),
    our_score: Joi.number().integer().min(0).allow(null),
    opponent_score: Joi.number().integer().min(0).allow(null),
    is_home: Joi.boolean(),
    status: Joi.string().valid('upcoming', 'live', 'result', 'completed', 'cancelled'),
    outcome: Joi.string().valid('win', 'loss', 'draw').allow(null),
    game_date: Joi.date().iso(),
    game_time: Joi.string().allow(null),
    venue: Joi.string().allow(null),
    opponent_logo_url: Joi.string().allow('', null),
    notes: Joi.string().allow(null),
  }),

  player: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    number: Joi.number().integer().positive().required(),
    position: Joi.string().required(),
    nationality: Joi.string().allow(''),
    height: Joi.string().allow(''),
    age: Joi.number().integer().min(0).allow(0),
    points_per_game: Joi.number().min(0).allow(0),
    team: Joi.string().valid('men', 'women', 'ladies', 'boys', 'girls').required(),
    bio: Joi.string().allow(''),
    career_highlights: Joi.string().allow(''),
    image_url: Joi.string().allow(''),
  }),

  news: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    category: Joi.string().required(),
    content: Joi.string().min(1).required(),
    image_url: Joi.string().allow(''),
  }),

  gallery: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    media_type: Joi.string().valid('image', 'video').required(),
    media_url: Joi.string().uri().required(),
  }),

  standings: Joi.object({
    tournament: Joi.string().required(),
    season: Joi.string().required(),
    team_name: Joi.string().required(),
    played: Joi.number().integer().min(0).allow(0),
    won: Joi.number().integer().min(0).allow(0),
    lost: Joi.number().integer().min(0).allow(0),
    forfeit: Joi.number().integer().min(0).allow(0),
    points_for: Joi.number().integer().min(0).allow(0),
    points_against: Joi.number().integer().min(0).allow(0),
    point_difference: Joi.number().integer().allow(0),
    points: Joi.number().integer().min(0).allow(0),
    group_name: Joi.string().allow('', null),
    team_category: Joi.string().allow(null),
  }).custom((value, helpers) => {
    const expectedPlayed = Number(value.won || 0) + Number(value.lost || 0) + Number(value.forfeit || 0);
    const expectedDiff = Number(value.points_for || 0) - Number(value.points_against || 0);
    if (Number(value.played || 0) !== expectedPlayed) {
      return helpers.error('any.invalid', { message: 'GP must equal W + L + Forfeit.' });
    }
    if (Number(value.point_difference || 0) !== expectedDiff) {
      return helpers.error('any.invalid', { message: 'DIFF must equal PF - PA.' });
    }
    return value;
  }, 'standings logical validation'),

  poll: Joi.object({
    question: Joi.string().min(1).required(),
    options: Joi.array().items(Joi.string()).min(2).required(),
  }),

  notification: Joi.object({
    user_id: Joi.number().integer().allow(null),
    title: Joi.string().min(1).max(200).required(),
    message: Joi.string().min(1).required(),
  }),

  checkout: Joi.object({
    userId: Joi.number().integer().positive().required(),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().positive().required(),
      })
    ).min(1).required(),
    paymentMethod: Joi.string().required(),
    mobileMoneyNumber: Joi.string().allow(''),
  }),

  confirmPayment: Joi.object({
    orderId: Joi.number().integer().positive().required(),
  }),
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    req.body = value;
    next();
  };
};

module.exports = {
  schemas,
  validate,
};
